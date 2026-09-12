'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'menu-data.js'),'utf8'),context);
const data=context.window.CAMPUS_DATA;
assert.ok(data.dishes.length>3,'Expanded dish dataset required');
assert.equal(new Set(data.dishes.map(d=>d.id)).size,data.dishes.length,'Dish IDs must be unique');
const sourceOwners=new Map();
for(const dish of data.dishes) {
  const source=new URL(dish.source);
  assert.equal(source.hostname,'dineoncampus.com');
  assert.ok(source.pathname.startsWith('/calpoly/whats-on-the-menu/'));
  assert.ok(source.pathname.includes('/'+data.date+'/'));
  assert.ok(['September 11, 2026','September 12, 2026'].includes(dish.checked));
  assert.ok(dish.name && dish.portion && dish.periods.length);
  assert.ok(data.directory.some(g=>g.places.includes(dish.restaurant)));
  if(sourceOwners.has(dish.source))assert.equal(sourceOwners.get(dish.source),dish.restaurant,'A menu URL cannot belong to two restaurants');
  sourceOwners.set(dish.source,dish.restaurant);
  for(const key of ['calories','protein','carbs','fat','fiber','sodium','vitaminC','calcium','iron'])assert.ok(dish[key]===null||(Number.isFinite(dish[key])&&dish[key]>=0),dish.name+': invalid '+key);
}
for(const row of data.coverage)assert.equal(row.items,data.dishes.filter(d=>d.restaurant===row.restaurant).length);
const nuggets=data.dishes.find(d=>d.restaurant==='Chick-fil-A'&&d.name==='8 ct. Grilled Nuggets');
assert.equal(nuggets.calories,110);assert.equal(nuggets.protein,21);assert.equal(nuggets.fat,2.5);
const sandwich=data.dishes.find(d=>d.restaurant==='Chick-fil-A'&&d.name==='Chick-fil-A® Chicken Sandwich');
assert.equal(sandwich.calcium,null,'Percent Daily Value must not be interpreted as milligrams');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const file of ['menu-data.js','app.js'])assert.ok(html.includes('src="'+file+'"'));
new vm.Script(fs.readFileSync(path.join(root,'app.js'),'utf8'));
console.log('Menu integrity checks passed: '+data.dishes.length+' dishes; '+data.coverage.length+' locations audited.');

