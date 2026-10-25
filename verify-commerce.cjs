const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store={},events={};let page='shop',query='';const nodes={};const node=s=>nodes[s]??={innerHTML:'',textContent:'',hidden:true,value:''};
const context={console,URLSearchParams,setTimeout:()=>{},crypto:require('crypto').webcrypto,location:{search:query},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},document:{body:{dataset:{page}},querySelector:node,addEventListener:(k,f)=>events[k]=f}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('catalog.js','utf8'),context);const code=fs.readFileSync('commerce.js','utf8');
function load(p,q=''){context.document.body.dataset.page=p;context.location.search=q;vm.runInContext(code,context);assert(node('#app').innerHTML.includes('<main>'),p)}
for(const p of ['shop','wishlist','cart','checkout','confirmation','account','track','contact','about','faq','shipping','privacy','terms','admin'])load(p);
load('product','?id=blue-talisman');assert(node('#app').innerHTML.includes('Blue Talisman'));
events.click({target:{closest:()=>({dataset:{add:'blue-talisman'}})}});assert(JSON.parse(store['bolix-bag-v1']).items.length===1);
load('cart');assert(node('#app').innerHTML.includes('Continue to checkout'));
load('checkout');assert(node('#app').innerHTML.includes('Place demo order'));
context.FormData=class {constructor(){return Object.entries({name:'Test Customer',email:'test@example.com',address:'Test street',city:'Lagos',state:'Lagos',phone:'08000000000'})[Symbol.iterator]()}};
events.submit({preventDefault(){},target:{id:'checkout'}});assert(JSON.parse(store['bolix-orders']).length===1);assert(JSON.parse(store['bolix-bag-v1']).items.length===0);
const order=JSON.parse(store['bolix-orders'])[0];load('confirmation','?id='+order.id);assert(node('#app').innerHTML.includes('Demo order received'));
for(const tab of ['overview','products','orders','customers'])load('admin','?tab='+tab);
console.log('PASS: all 15 pages render; add-to-bag, cart, checkout order creation, bag clearing, confirmation, and four admin views.');

