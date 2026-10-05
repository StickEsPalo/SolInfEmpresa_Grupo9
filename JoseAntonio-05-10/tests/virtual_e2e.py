#!/usr/bin/env python3
"""Prueba virtual de extremo a extremo de PlanetaFicha.

No usa MySQL: levanta la misma API PHP con el adaptador mock incluido en el proyecto,
reproduciendo las sesiones, ACL, cálculo de pedidos, eventos y consultas del frontend.
"""
from __future__ import annotations
import json, shutil, subprocess, sys, tempfile, time, re
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8093'
checks=[]

def check(name, ok, detail=''):
    checks.append((name,bool(ok),detail))
    print(('PASS' if ok else 'FAIL') + ' - ' + name + (f' :: {detail}' if detail else ''))

def get(s, path, expected=200, headers=None):
    r=s.get(BASE+path,headers=headers or {},timeout=5)
    check(f'GET {path} -> {expected}', r.status_code==expected, f'status={r.status_code} body={r.text[:240]}')
    return r

def post(s, path, payload, expected=200, csrf=None, headers=None):
    h=dict(headers or {})
    if csrf: h['X-CSRF-Token']=csrf
    r=s.post(BASE+path,json=payload,headers=h,timeout=5)
    check(f'POST {path} -> {expected}', r.status_code==expected, f'status={r.status_code} body={r.text[:300]}')
    return r

def main():
    tmp = Path(tempfile.mkdtemp(prefix='planetaficha-e2e-'))
    try:
        shutil.copy2(ROOT/'tests'/'mock-db.json', tmp/'mock-db.json')
        config = tmp/'config.php'
        config.write_text("""<?php\nreturn [\n  'app'=>['base_url'=>'http://127.0.0.1:8093','timezone'=>'Europe/Madrid'],\n  'db'=>['driver'=>'mock','file'=>__DIR__.'/../../tests/mock-db.json'],\n  'mail'=>['enabled'=>false],\n  'security'=>['session_name'=>'planetaficha_test_session']\n];\n""")
        runtime = tmp/'site'
        shutil.copytree(ROOT, runtime, ignore=shutil.ignore_patterns('.git'))
        prodcfg = runtime/'api'/'config'/'config.php'
        shutil.copy2(config, prodcfg)
        # Do not expose a test-only config in the runtime copy.
        (runtime/'api'/'config'/'local.test.php').unlink(missing_ok=True)
        (runtime/'tests'/'config.test.php').unlink(missing_ok=True)
        # The mock DB inside runtime must be the copied clean fixture.
        shutil.copy2(tmp/'mock-db.json', runtime/'tests'/'mock-db.json')
        proc=subprocess.Popen(['php','-S','127.0.0.1:8093','-t',str(runtime)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
        try:
            time.sleep(0.8)
            s=requests.Session()
            # API/catalog
            r=get(s,'/api/health.php'); d=r.json(); check('Health reports API connected on mock adapter and 16 products',d.get('ok') is True and d.get('database')=='connected' and d.get('products')==16)
            r=get(s,'/api/products.php'); products=r.json().get('products',[]); check('Catalog returns 16 active products',len(products)==16); check('Catalog rows contain product data needed by UI', bool(products) and all(k in products[0] for k in ['id','title','price','stock','image','parentId']))
            # anonymous security/session
            r=get(s,'/api/auth/session.php'); sd=r.json(); check('Anonymous session has CSRF token and no user',sd.get('authenticated') is False and sd.get('user') is None and bool(sd.get('csrfToken'))); csrf=sd['csrfToken']
            get(s,'/api/admin/orders.php',401)
            post(s,'/api/orders/create.php',{'customer':{},'items':[{'productId':3,'quantity':1}],'paymentMethod':'Tarjeta de prueba'},401,csrf)
            post(s,'/api/events/log.php',{'type':'cart.item_added','productId':3},419,'WRONG-CSRF')
            get(s,'/api/admin/events.php',403,headers={'Origin':'https://evil.example'})
            # Ana login
            r=post(s,'/api/auth/login.php',{'email':'ana.demo@example.com','password':'demo123'},200,csrf); a=r.json(); csrf=a['csrfToken']; check('Ana authenticates as cliente',a.get('user',{}).get('role')=='cliente' and a.get('user',{}).get('id')==1)
            r=get(s,'/api/auth/session.php'); sd=r.json(); check('Authenticated session reports Ana',sd.get('authenticated') is True and sd.get('user',{}).get('id')==1)
            r=get(s,'/api/orders/my-orders.php'); own=r.json().get('orders',[]); check('Ana initially sees only her demo order',len(own)==1 and own[0].get('userId')==1)
            # create order; server is source of truth
            payload={'customer':{'name':'Ana Demo','email':'ana.demo@example.com','address':'C/ Ejemplo, 42','postalCode':'28001','city':'Madrid'},'items':[{'productId':3,'quantity':2},{'productId':3,'quantity':1}],'paymentMethod':'Tarjeta de prueba','promoCode':'YUZU10'}
            r=post(s,'/api/orders/create.php',payload,201,csrf); order=r.json()['order']; t=order['totals']; check('Order mail status is explicit when SMTP is disabled in the mock',r.json().get('mailSent') is False)
            check('Order combines duplicate lines and calculates totals server-side',t=={'subtotal':44.85,'tax':9.92,'shipping':6.9,'discount':4.49,'total':57.18},str(t))
            check('Created order is attributed to Ana',order.get('userId')==1 and order.get('userEmail')=='ana.demo@example.com')
            r=get(s,'/api/orders/my-orders.php'); own=r.json().get('orders',[]); check('Ana can see the new order from Mi cuenta',len(own)==2 and own[0].get('dbId')==order.get('dbId'))
            mock=json.loads((runtime/'tests'/'mock-db.json').read_text())
            oev=[e['tipo_evento'] for e in mock['events'] if e.get('pedido_id')==order['dbId']]; check('Order creates exactly one order.created and one payment.simulated event',oev.count('order.created')==1 and oev.count('payment.simulated')==1,str(oev))
            virus=next(p for p in mock['products'] if p['id']==3); check('Stock is decremented by the purchased quantity',virus['stock']==17)
            # logout/login isolation
            old=csrf; r=post(s,'/api/auth/logout.php',{},200,csrf); csrf=r.json()['csrfToken']; check('Logout rotates CSRF token',csrf!=old)
            r=get(s,'/api/auth/session.php'); check('After logout session is anonymous',r.json().get('authenticated') is False)
            r=post(s,'/api/auth/login.php',{'email':'carlos.demo@example.com','password':'demo123'},200,csrf); csrf=r.json()['csrfToken']
            r=get(s,'/api/orders/my-orders.php'); check('Carlos cannot see Ana orders',r.json().get('orders',[])==[])
            get(s,'/api/admin/orders.php',403)
            # registration validation and persistence
            post(s,'/api/auth/logout.php',{},200,csrf); csrf=get(s,'/api/auth/session.php').json()['csrfToken']
            post(s,'/api/auth/register.php',{'firstName':'maria','lastName':'Lopez','email':'bad@example.com','password':'Maria1234'},422,csrf)
            r=post(s,'/api/auth/register.php',{'firstName':'Maria','lastName':'Lopez','email':'maria.test@example.com','password':'Maria1234'},201,csrf); reg=r.json(); csrf=reg['csrfToken']; check('Registered account is automatically cliente',reg.get('user',{}).get('role')=='cliente')
            check('Registered account receives a DB id',isinstance(reg.get('user',{}).get('id'),int) and reg['user']['id']>=4)
            r=get(s,'/api/orders/my-orders.php'); check('New user starts with empty order history',r.json().get('orders',[])==[])
            r=post(s,'/api/support.php',{'subject':'Prueba','message':'Solicitud de soporte de prueba virtual'},201,csrf); check('Support is stored and reports disabled SMTP without losing the incident',r.json().get('ok') is True and r.json().get('incidentId','').startswith('INC-') and r.json().get('mailSent') is False)
            post(s,'/api/events/log.php',{'type':'cart.item_added','productId':3,'payload':{'quantity':1}},200,csrf)
            # Admin
            post(s,'/api/auth/logout.php',{},200,csrf); csrf=get(s,'/api/auth/session.php').json()['csrfToken']
            r=post(s,'/api/auth/login.php',{'email':'admin@example.com','password':'admin123'},200,csrf); admin=r.json(); csrf=admin['csrfToken']; check('Admin authenticates as administrador',admin.get('user',{}).get('role')=='administrador')
            r=get(s,'/api/admin/orders.php'); orders=r.json().get('orders',[]); check('Admin can see all stored orders and their users',len(orders)>=2 and all(o.get('userId') and o.get('userEmail') for o in orders))
            r=get(s,'/api/admin/events.php'); events=r.json().get('events',[]); check('Admin can see order/payment/instrumentation events',any(e.get('tipo_evento')=='order.created' for e in events) and any(e.get('tipo_evento')=='payment.simulated' for e in events) and any(e.get('tipo_evento')=='cart.item_added' for e in events))
            check('Support requested event is stored',any(e.get('tipo_evento')=='support.requested' for e in events))
            # static integration
            index=(runtime/'index.html').read_text(); auth=(runtime/'js/auth.js').read_text(); cart=(runtime/'js/cart.js').read_text(); checkout=(runtime/'js/checkout.js').read_text(); adminjs=(runtime/'js/admin.js').read_text(); header=(runtime/'components/header.html').read_text(); dialogs=(runtime/'components/dialogs.html').read_text();
            css=(runtime/'styles.css').read_text()
            m=re.search(r'ASSET_VERSION\s*=\s*"([^"]+)"',index); cv=re.search(r'styles\.css\?v=([^"\']+)',index)
            check('Asset cache versions in index are synchronized',bool(m and cv and m.group(1)==cv.group(1)=='20261003-db1'))
            check('Index loads auth before protected modules',index.find('await loadScript("./js/auth.js")') < index.find('await loadScript("./js/cart.js")'))
            check('Frontend cart gates unauthenticated access', 'requireAuth(' in cart and 'function openCart()' in cart)
            check('Checkout sends orders to server API', './api/orders/create.php' in checkout)
            check('Mi cuenta reads only own orders endpoint', './api/orders/my-orders.php' in auth)
            check('Back-office uses protected admin endpoint', './api/admin/orders.php' in adminjs)
            check('Header exposes Mi cuenta/login and cart', 'data-action="open-auth"' in header and 'data-action="open-cart"' in header)
            check('Dialogs contain account order list and admin control', 'id="account-orders"' in dialogs and 'id="account-admin-button"' in dialogs)
            # Files served
            r=get(s,'/index.html'); check('Index is reachable via HTTP',r.status_code==200 and '<title>PlanetaFicha - Juegos de importación</title>' in r.text)
            for comp in ['header.html','catalog.html','cart.html','dialogs.html']:
                rr=get(s,'/components/'+comp); check(f'Component {comp} is reachable',rr.status_code==200 and len(rr.text)>100)
            # syntax
            php_bad=[]
            for f in (runtime/'api').rglob('*.php'):
                p=subprocess.run(['php','-l',str(f)],capture_output=True,text=True)
                if p.returncode: php_bad.append((str(f),p.stdout+p.stderr))
            check('All API PHP files pass php -l',not php_bad,str(php_bad[:2]))
            js_bad=[]
            for f in runtime.rglob('*.js'):
                p=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
                if p.returncode: js_bad.append((str(f),p.stdout+p.stderr))
            check('All JavaScript files pass node --check',not js_bad,str(js_bad[:2]))
            # SQL structure checks (static, because environment has no MySQL driver)
            sql=(ROOT/'database'/'juegos_y_puzles.sql').read_text()
            required=['CREATE TABLE `usuarios`','CREATE TABLE `productos`','CREATE TABLE `pedidos`','CREATE TABLE `lineas_pedido`','CREATE TABLE `pagos`','CREATE TABLE `eventos`','ADD CONSTRAINT `pedidos_ibfk_1`','ADD CONSTRAINT `lineas_pedido_ibfk_1`']
            check('SQL export contains required tables and foreign keys',all(x in sql for x in required))
            check('SQL export contains 16 product rows',sql.count("INSERT INTO `productos`")==1 and sql.split("INSERT INTO `productos`")[1].count('),')>=15)
            # config and security
            example=(ROOT/'api/config/config.example.php').read_text()
            gitignore=(ROOT/'.gitignore').read_text()
            check('Deployment placeholders are documented in the safe example config', 'TU-DOMINIO-AQUI' in example and 'TU_USUARIO_MYSQL' in example and 'TU_PASSWORD_MYSQL' in example)
            check('Git ignores the live configuration containing database/SMTP secrets', '/api/config/config.php' in gitignore and '/.env' in gitignore)
            check('Example config contains no demo application password', 'admin123' not in example and 'demo123' not in example)
            check('Demo passwords in SQL are bcrypt hashes', all(h in sql for h in ['$2y$12$tUK5ZR8m0ywviD4yy5C.iO46jcbxtPzmTDd9d3X.nH9p8TYA/Bp8.','$2y$12$Wn/8i1dNQdh7upzDZDF7yO3xOFG0j5d1ShVMdMlkprKzUMTdcEPX6']))
            # server log
            try:
                proc.terminate(); out,_=proc.communicate(timeout=3)
            except Exception:
                proc.kill(); out,_=proc.communicate()
            check('PHP test server produced no warnings/fatal errors', not re.search(r'PHP (Warning|Fatal error|Parse error|Notice):', out or ''), (out or '')[-500:])
        finally:
            if proc.poll() is None: proc.kill()
        passed=sum(1 for _,ok,_ in checks if ok); failed=len(checks)-passed
        print(f'\nTOTAL CHECKS: {len(checks)} | PASS: {passed} | FAIL: {failed}')
        if failed:
            for n,ok,d in checks:
                if not ok: print('FAILED:',n,d)
            return 1
        return 0
    finally:
        shutil.rmtree(tmp,ignore_errors=True)

if __name__=='__main__': sys.exit(main())
