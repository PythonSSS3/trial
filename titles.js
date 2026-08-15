// Titles / text-style module

function getTextStyleClass(item){
  if(!item || item.kind!=="textstyle") return "";
  if(item.id.includes("neon")) return "style-neon";
  if(item.id.includes("serif")) return "style-serif";
  if(item.id.includes("terminal")) return "style-terminal";
  if(item.id.includes("wide")) return "style-wide";
  if(item.id.includes("glow")) return "style-glow";
  return "style-royal";
}

function getTitleItems(){
  return (typeof SHOP_ITEMS!=="undefined" ? SHOP_ITEMS : []).filter(item=>item.kind==="title");
}
