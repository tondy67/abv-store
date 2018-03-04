/** 
 * abv-mp
 */
"use strict";

// node --inspect server.js | Open 'about:inspect' in Chrome
// export DEBUG=abv:*,info / unset DEBUG
const ts = require('abv-ts')('abv:server');

const ABV_URL = 'https://tondy67.github.io/abvos/nodes.html';
const $stripe_pk = process.env.STRIPE_PK || "";
const $stripe_sk = process.env.STRIPE_SK || "";
const stripe = require("stripe")($stripe_sk);

const $store_name = process.env.STORE_NAME || "Apps marketplace";

const pjson = require('./package.json');
const Aspa = require('abv-spa');
const AbvNode = require('abv-node');
const fs = require('abv-vfs');

const $port = 8080;
const $host = '0.0.0.0';
const $root = __dirname + '/public';
// AbvOS vfs root
const $afsd = '/items';

const port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || $port;
const ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || $host;

const $afs = fs.rebuildAbv($root + $afsd); 
const $afsf = new Map();
for (let f of $afs.files) if (f) $afsf.set(f.name, f);

const aspa = new Aspa({root: $root, cache: 3});

const $amount = (s) => {
	let r = 0;
	try{ r = parseFloat(s.replace(',','.')).toFixed(2);}catch(e){}
	return r;
};

const $currency = (s) => {
	let cur = s || 'eur';
	cur = cur.toLowerCase();
	const c = ['eur','usd','gbp','cad','aud'];
	if (!c.includes(cur)) cur = 'eur'; 
	return cur;
};

aspa.on('/store',(req, res) => {
	const r = aspa.open('/store.html',req.url);
	let s = '';
	let featured = '';
	let latest = '';
	for (let f of $afs.files){
		if (!f) continue;
		s = '<div class="item shadow">' +
		'<img src="'+ $afsd+'/'+f.name+'/'+f.logo+'" width="150" height="150" />' +
		'<p class="stats">$'+f.price+'</p>' + 
		'<h3 class="name"><a href="/item/'+f.name+'" >'+f.name+'</a></h3>' +
		'<p class="desc">'+f.desc+'</p></div>';

		if (f.tags.includes('latest')){
			latest += s;
		}else if (f.tags.includes('featured')){
			featured += s;
		}
	} 
	const tpl = {store: $store_name, latest: latest, featured: featured};
	r.send(res, tpl);
});
aspa.match('/item/(.*)',(match,req, res) => {
	const r = aspa.open('/item.html',req.url);
	let name = '';
	try{ name = decodeURI(match[1]); }catch(e){}
	let tpl;
	if ($afsf.has(name)){
		const f = $afsf.get(name);
		const logo = $afsd + '/' + f.name + '/' + f.logo;
		tpl = {amount: f.price*100, key: $stripe_pk,store: $store_name, name: f.name, logo: logo, desc: f.desc, price: f.price, cur:'usd'};
	}

	r.send(res, tpl);
});

//aspa.match('/item/(.*)',(match, req, res) => {
//	res.end('Aspa match: ' + req.url);
//});

aspa.on('/order',(req, res) => {
	aspa.post(req,res).then(post => {
		const p = post.params;
		if (p['g-recaptcha-response'] == '') 
			return aspa.redirect(res, '/order.html?m=robot',req.url,303);
		const r = aspa.open('/orders.html',req.url);
		const amount = $amount(p.amount) * 100;
		const cur = $currency(p.currency);
		const tpl = {key: $stripe_pk, amount: amount, cur: cur, name: p.name, desc: p.desc}; 
		r.send(res, tpl);
	}).catch(err => { 
		ts.error(err);
		if (err !== 413) res.end();
		else aspa.res(413,req.url).send(res);
	});
});

aspa.on('/checkout',(req, res) => {
	aspa.post(req,res).then(post => {
		const p = post.params;
		const token = p.stripeToken; 
		const amount = p.amount;
		const cur = $currency(p.currency);
		const desc = p.desc || "Translation EN/ES";
		// Charge the user's card:
		if (amount > 50) stripe.charges.create({
			  amount: amount,
			  currency: cur,
			  description: desc,
			  source: token,
			  metadata: {name: p.name}
			}, (err, charge) => {
			  if (err) return ts.error(80,err);
//			  ts.log(charge);
			});
		const r = aspa.open('/checkout.html',req.url);
		const tpl = {title: 'Thank you!'}; 
		r.send(res, tpl);
	}).catch(err => { 
		ts.error(81,err);
		if (err === 413){
			aspa.res(413,req.url).send(res);
		}else{
			res.end();
		}
	});
});

// Set templates
aspa.tpl('/index.html',{
	title:'Abvos ' + pjson.version,
	store: $store_name
});
aspa.tpl('/contact.html',{
	store: $store_name
});
aspa.tpl('/tos.html',{
	store: $store_name
});

const $ip = aspa.ips()[0];

const server = aspa.listen(port, ip, (err) => {  
		if (err) return ts.error(err);
		ts.info('Node.js: ' + process.version);
		ts.println(`Abvos node is running on http://${$ip}:${port}`,ts.BLUE);
	});

///
let WebSocket = null;

try{
	WebSocket = require('uws');
}catch(e){
	ts.log('Fallback to ws');
	WebSocket = require('ws');
}

const node = new AbvNode(server,WebSocket);

///
/*
const ensureSecure = (req, res) => {
  if(req.get('x-forwarded-proto') === 'https')
	res.redirect('https://' + req.hostname + req.url); 
}; */


