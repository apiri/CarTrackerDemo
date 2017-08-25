// Adapted from: http://stackoverflow.com/a/40870439/231008
const markerHtmlStyles = `
  background-color: #FF0000;
  width: 1rem;
  height: 1rem;
  display: block;
  left: -.5rem;
  top: -.5rem;
  position: relative;
  border-radius: 1rem 1rem 0;
  transform: rotate(45deg);`

const wifiMarkerHtmlStyles = `
  background-color: #0000FF;
  width: .5rem;
  height: .5rem;
  display: block;
  left: -.25rem;
  top: -.25rem;
  position: relative;
  border-radius: .5rem .5rem 0;
  transform: rotate(45deg);`

const icon = L.divIcon({
  iconAnchor: [0, 24],
  labelAnchor: [-6, 0],
  popupAnchor: [0, -36],
  html: `<span style="${markerHtmlStyles}" />`
})

const iconWifi = L.divIcon({
  iconAnchor: [0, 24],
  labelAnchor: [-6, 0],
  popupAnchor: [0, -36],
  html: `<span style="${wifiMarkerHtmlStyles}" />`
})

var map = L.map('map');
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    minZoom: 8,
    maxZoom: 12,
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  });
map.addLayer(osm);
map.setView([0, 0], 10);
map.panTo([42.095425, -83.241576]);
map.setZoom(14);

var svg = d3.select(map.getPanes().overlayPane).append("svg");

var g = svg.append("g").attr("class", "leaflet-zoom-hide");

var lineFunction = d3.svg.line()
                       .x(function(d) { return d.x; })
                       .y(function(d) { return d.y; })
                       .interpolate("linear");

// d3.json("/wifis.json", function(error, collection) {
//   if (error) {
//     throw error;
//   }
//   // fit the map
//   var geo = L.geoJson(collection);
//   map.fitBounds(geo);
// });

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToRGB(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

function reverse(str) {
  if(!str.trim() || 'string' !== typeof str) {
    return;
  }
  let l=str.length, s='';
  while(l > 0) {
    l--;
    s+= str[l];
  }
  return s;
}

var duration = 5000;
var entity_data = {};
var lteStops = [];

function processEvent(event) {
  try {
    var msg = event;
    var instance_id = msg.instance_id;
    console.log("received event for instance " + instance_id)
    // Have we been seen the first time
    if (!(instance_id in entity_data)) {
      entity_data[instance_id] = {};
      curr_instance = entity_data[instance_id];
      curr_instance['color'] = intToRGB(hashCode(instance_id));
      curr_instance['lteStops'] = [];
      curr_instance['wifi'] = [];
    }

    switch (msg.type) {
      case "position":
        var lat = parseFloat(msg.latitude_degrees);
        var lon = parseFloat(msg.longitude_degrees);

        // Determine event type and populate map with a marker
        // Buffer LTE events to drive map positioning
        var iconType = icon;
        if (msg.modem == 'wifi') {
          iconType = iconWifi;
          iconType.options.html=iconType.options.html.replace('#FF0000','#'+reverse(curr_instance['color']));
        } else {
          curr_instance['lteStops'].push([lat, lon]);
          map.fitBounds(curr_instance['lteStops'], {padding: [25, 25]});
          iconType.options.html=iconType.options.html.replace('#FF0000','#'+curr_instance['color']);
        }
        L.marker([lat, lon], {icon: iconType}).addTo(map);

        break;

      default:
        break;
    }
  } catch (e) {
    console.log('Dodgy data: ', e, event);
    console.log(event);
  }
}

function wsConnect() {
  var address = document.getElementById("ws-address").value;
  var eb = new vertx.EventBus(address);
  eb.onopen = function() {
    eb.registerHandler("messages", processEvent);
  };
}
