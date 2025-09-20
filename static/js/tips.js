// tips.js
(function(){
  const about = {
    Clear: { desc: "Bright sunny conditions.", dress: ["Light breathable fabrics","Sunglasses & sunscreen","Cap or hat"] },
    Clouds: { desc: "Cloudy skies, milder temperatures.", dress: ["Light layer","Comfortable shoes","Carry a light umbrella"] },
    Rain: { desc: "Rainy — expect wet surfaces.", dress: ["Waterproof jacket","Umbrella","Closed shoes"] },
    Thunderstorm: { desc: "Severe storm possible.", dress: ["Stay indoors","Avoid open fields"] },
    Snow: { desc: "Cold with snowfall.", dress: ["Insulated coat","Gloves","Waterproof boots"] }
  };
  const safety = {
    Thunderstorm: ["Seek shelter indoors","Avoid tall trees & metal objects","Unplug sensitive electronics"],
    Flood: ["Move to higher ground","Never drive through flood water","Keep emergency kit ready"],
    Heatwave: ["Stay hydrated","Avoid outdoor exertion at midday","Check on vulnerable people"]
  };

  function renderAbout(kind){
    const a = about[kind] || null;
    if(!a) return "<p>No tips available.</p>";
    return `<p>${a.desc}</p><h4>Dress Tips</h4><ul>${a.dress.map(x=>`<li>${x}</li>`).join("")}</ul>`;
  }
  function renderSafety(kind){
    const s = safety[kind] || null;
    if(!s) return "<p>No safety tips available.</p>";
    return `<ul>${s.map(x=>`<li>${x}</li>`).join("")}</ul>`;
  }

  window.TIPS = { renderAbout, renderSafety };
})();