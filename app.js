"use strict";
(function () {
  const data = window.CAMPUS_DATA;
  const $ = id => document.getElementById(id);
  if (!data) { $("restaurant-status").textContent = "Menu data could not load. Please reload this page."; return; }
  const nutrients = [["protein","Protein","g"],["carbs","Carbs","g"],["fat","Fat","g"],["fiber","Fiber","g"],["sodium","Sodium","mg"],["vitaminC","Vitamin C","mg"],["calcium","Calcium","mg"],["iron","Iron","mg"]];
  const directory = data.directory.filter(g=>["1901 Marketplace","Vista Grande"].includes(g.area));
  const dishes = data.dishes;
  const macros = nutrients.slice(0,3);
  const mealFirst = d => /sandwich|bowl|burger|pizza|tender|nugget|teriyaki chicken|orange chicken|kung pao|beijing beef|broccoli beef|shrimp|scramble|overnight oats|bagel|wrap|pasta|noodle|salad/i.test(d.name) && !/sauce|dressing|seasoning/.test(d.name.toLowerCase());
  const byId = new Map(dishes.map(d => [d.id,d]));
  const selected = new Map();
  let activeArea = data.directory[0].area, activeRestaurant = data.directory[0].places[0], selectedId = null;
  const fmt = n => new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n);
  function el(tag,text,cls) { const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n; }
  function link(text,url) { const a=el("a",text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a; }
  function metric(label,value,unit,coverage) {
    const n=el("div");n.append(el("span",label),el("b",value===null?"Not reported":fmt(value)+" "+unit));
    if(coverage)n.append(el("small",coverage,"coverage"));return n;
  }
  function restaurantDishes(name) {return dishes.filter(d=>d.restaurant===name);}
  function renderChoices() {
    $("restaurant-list").replaceChildren();
    directory.find(g=>g.area===activeArea).places.filter(name=>restaurantDishes(name).length).forEach(name=>{
      const count=restaurantDishes(name).length;
      const b=el("button",name+" · "+count,"restaurant-choice");b.type="button";b.setAttribute("aria-pressed",String(name===activeRestaurant));
      b.addEventListener("click",()=>selectRestaurant(name));$("restaurant-list").append(b);
    });
  }
  function selectRestaurant(name) {
    activeRestaurant=name;selectedId=null;$("detail").hidden=true;$("dish-search").value="";
    $("area-label").textContent=activeArea;$("restaurant-title").textContent=name;
    const count=restaurantDishes(name).length;
    const record=data.coverage.find(c=>c.restaurant===name);
    $("restaurant-badge").textContent=count?count+" dishes":"No published dishes";
    $("restaurant-status").textContent=count?"Main-dish names appear first. For build-your-own meals, add each component you eat. Values are per listed portion.":(record?.note||"This location is not listed in the official menu selector for the snapshot date.");
    $("source-line").hidden=false;$("source-line").replaceChildren(document.createTextNode("Menu date "+data.date+" · "),link("Official Campus Dining menu",record?.url||data.source));
    renderChoices();renderDishes();
  }
  function renderDishes() {
    const term=$("dish-search").value.trim().toLowerCase();
    const visible=restaurantDishes(activeRestaurant).filter(d=>(d.name+" "+d.portion).toLowerCase().includes(term)).sort((a,b)=>Number(mealFirst(b))-Number(mealFirst(a)) || a.name.localeCompare(b.name));
    $("dish-list").hidden=false;$("dish-list").replaceChildren();
    if(!visible.length) {$("dish-list").append(el("p",term?"No dishes match your search.":"No dishes published in this saved menu.","coverage"));return;}
    visible.forEach(d=>{
      const card=el("article",undefined,"dish"+(selectedId===d.id?" is-active":""));
      card.append(el("h4",d.name),el("p",d.portion+" · "+d.periods.join(", "),"portion"));
      const c=el("div",d.calories===null?"Unknown":fmt(d.calories),"calories");c.append(el("span","cal"));card.append(c);
      card.append(el("p",["protein","carbs","fat"].map(k=>({protein:"Protein",carbs:"Carbs",fat:"Fat"}[k])+": "+(d[k]===null?"not reported":fmt(d[k])+"g")).join(" · "),"macro-line"));
      const actions=el("div",undefined,"dish-actions"),view=el("button","View nutrients","button secondary"),add=el("button","Add","button primary");
      view.type=add.type="button";view.setAttribute("aria-label","View nutrients for "+d.name+" ("+d.portion+")");add.setAttribute("aria-label","Add "+d.name+" ("+d.portion+") to "+$("meal").value);
      view.addEventListener("click",()=>showDetail(d));add.addEventListener("click",()=>addDish(d));
      actions.append(view,add);card.append(actions);$("dish-list").append(card);
    });
  }
  function showDetail(d) {
    selectedId=d.id;const panel=$("detail");panel.hidden=false;panel.replaceChildren();
    const heading=el("h3",d.name);heading.id="detail-title";heading.tabIndex=-1;panel.append(heading,el("p",d.restaurant+" · "+d.portion+" · "+(d.calories===null?"Calories not reported":fmt(d.calories)+" calories")));
    const grid=el("div",undefined,"nutrition-grid");nutrients.filter(([key])=>macros.some(([k])=>k===key)||d[key]!==null||d.qualifiers?.[key]).forEach(([key,label,unit])=>{const m=metric(label,d[key],unit);if(d.qualifiers?.[key])m.querySelector("b").textContent=d.qualifiers[key];grid.append(m);});panel.append(grid);
    panel.append(el("p","Values are transcribed from the official menu. Missing amounts are not treated as zero."));
    const foot=el("p",undefined,"detail-footer");foot.append(document.createTextNode("Checked "+d.checked+" · "),link("Official menu",d.source));panel.append(foot);
    renderDishes();heading.focus({preventScroll:true});panel.scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  function addDish(d) {
    const meal=$("meal").value,key=d.id+"|"+meal,entry=selected.get(key);
    if(entry)entry.count++;else selected.set(key,{id:d.id,meal,count:1});
    renderSpread();$("status").textContent=d.name+" added to "+meal+".";
  }
  function totalFor(key) {
    let value=0,known=0,portions=0;
    selected.forEach(e=>{portions+=e.count;const n=byId.get(e.id)[key];if(n!==null){value+=n*e.count;known+=e.count;}});
    return {value:portions&&known===0?null:value,known,portions};
  }
  function renderSpread() {
    $("spread").replaceChildren();
    if(!selected.size)$("spread").append(el("p","Choose a dish, then add it to a meal.","empty"));
    selected.forEach((e,key)=>{
      const d=byId.get(e.id),card=el("article",undefined,"selection"),top=el("div",undefined,"selection-top"),name=el("div");
      name.append(el("h4",d.name),el("p",d.restaurant+" · "+e.meal+" · "+e.count+" × "+d.portion),el("p",d.calories===null?"Calories not reported":fmt(d.calories*e.count)+" cal"));
      const remove=el("button","Remove one","remove");remove.type="button";remove.setAttribute("aria-label","Remove one "+d.name+" from "+e.meal);
      remove.addEventListener("click",()=>{if(--e.count===0)selected.delete(key);renderSpread();$("status").textContent="Removed one "+d.name+" from "+e.meal+".";$("meal").focus({preventScroll:true});});
      top.append(name,remove);card.append(top);const ref=el("span",undefined,"selection-source");ref.append(document.createTextNode("Checked "+d.checked+" · "),link("Official menu",d.source));card.append(ref);$("spread").append(card);
    });
    const calories=totalFor("calories");
    $("calorie-total").replaceChildren(document.createTextNode(calories.value===null?"Unknown":fmt(calories.value)),el("span",calories.known<calories.portions?"calories · partial":"calories"));
    $("total-grid").replaceChildren();
    macros.forEach(([key,label,unit])=>{const t=totalFor(key);$("total-grid").append(metric(label,t.value,unit,t.known<t.portions?"Partial: "+t.known+"/"+t.portions+" portions reported":undefined));});
  }
  directory.forEach(g=>{const o=el("option",g.area);o.value=g.area;$("area").append(o);});
  $("area").addEventListener("change",()=>{activeArea=$("area").value;selectRestaurant(directory.find(g=>g.area===activeArea).places.find(name=>restaurantDishes(name).length));});
  $("meal").addEventListener("change",renderDishes);$("dish-search").addEventListener("input",renderDishes);
  $("catalog-count").textContent=dishes.length+" saved dishes across "+new Set(dishes.map(d=>d.restaurant)).size+" locations";
  $("snapshot-summary").textContent="Menu snapshot · "+data.checked;
  $("snapshot-description").textContent="1901 Marketplace + Vista Grande. Calories and macros first. Saved menu, not live availability. Only restaurants with imported food are shown.";
  selectRestaurant(activeRestaurant);renderSpread();
}());

