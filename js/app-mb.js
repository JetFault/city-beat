function d3layer() {
  var layer = {}, collection, bounds, feature;

  var div = d3.select(document.body)
      .append('div')
      .attr('class', 'pulse');

  var svg = div.append('svg');
  var g = svg.append('g');

  layer.parent = div.node();

  layer.project = function(x) {
    var point = layer.map.locationPoint({ lat:x[1], lon: x[0] });
    return [point.x, point.y];
  };

  var first = true;
  layer.draw = function() {
    first && svg.attr("width", layer.map.dimensions.x)
       .attr("height", layer.map.dimensions.y)
       .style("margin-left", "0px")
       .style("margin-top", "0px") && (first=false);

    /* Adjust svg size on resize, fixes issue with cropping when resized */
    $(window).resize(function() {
      svg.attr("width", layer.map.dimensions.x)
       .attr("height", layer.map.dimensions.y);
    });

    var coords = function(d) {
      return layer.project(d.geometry.coordinates);
    };

    if(!feature) {
      return;
    }

    feature.attr("cy", function(d) { return coords(d)[1]; });
    feature.attr("cx", function(d) { return coords(d)[0]; });
    feature.attr("r", function(d) { return start_scale; });
  };


  /* Takes animation function as a parameter */
  layer.animate = function(animation_func) {
    feature.each(function() {
      animation_func(d3.select(this));
    });
  };

  layer.data = function(geoJsonOrFeatures) {
    if (geoJsonOrFeatures instanceof Array) {
      collection = {"type":"FeatureCollection", "features": geoJsonOrFeatures};
    } else {
      collection = geoJsonOrFeatures;
    }

    bounds = d3.geo.bounds(collection);

    /*
    bounds = [
      [
        d3.min(collection.features, function(f) {
          return f.geometry.coordinates[0];
        }),
        d3.min(collection.features, function(f) {
          return f.geometry.coordinates[1];
        })
      ],
      [
        d3.max(collection.features, function(f) {
          return f.geometry.coordinates[0];
        }),
        d3.max(collection.features, function(f) {
          return f.geometry.coordinates[1];
        })
      ]
    ];*/
    

    feature = g.selectAll("circle")
        .data(collection.features)
        .enter().append("circle");

    return layer;
  };

  layer.extent = function() {
    var ext = new MM.Extent(new MM.Location(bounds[0][1], bounds[0][0]),
                            new MM.Location(bounds[1][1], bounds[1][0])
                           );
                           
  };

  return layer;
};

/* Animations */
var expand_contract = function(feat) {
  feat
    .transition()
      .delay(function(d) { return d.properties.pulse_time; })
      .duration(500).ease(Math.sqrt)
      .attr("r", function(d) { return d.properties.max_scale; })
      .style("fill-opacity", .3)
    .transition()
      .duration(500).ease(Math.sqrt)
      .attr("r", 25)
      .style("fill-opacity", .5)
    .each('end', function() {
      expand_contract(feat);
    });
};

var earthquake = function(feat) {
  feat
    .attr("r", function(d) { return start_scale; })
    .style("fill-opacity", 0.8)
    .transition()
      .delay(function(d) { return d.properties.pulse_time; })
      .duration(2000).ease(Math.sqrt)
      .attr("r", function(d) { return d.properties.max_scale; })
      .style("fill-opacity", 1e-6)
    .each('end', function() {
      earthquake(feat);
    });
};





/* Figure out what the data pulse rate is based on deviation */
var data_pulse_prop = function(deviation, scale_function, pulse_function) {
  var props = {"start_scale": start_scale, "pulse_rate": pulse_rate};


  scale_function = function(start, dev) {
    //return start + Math.pow(Math.E, dev) * 20;
    return start + (Math.pow(2, dev) - 1) * scale_factor;
  };

  props.max_scale = scale_function(start_scale, deviation);

  props.pulse_time /= deviation;
  
  return props;
};


/* Fetch Data, create geo features */
var fetch_data = function(cb) {

  var data = [];

  d3.json('http://ec2-23-22-67-45.compute-1.amazonaws.com/citybeat-backend/get_foursquare_heatmap', function(error, json) {
    if(error) {
      console.log(error);
      cb(error);
    }

    for(var i = 0; i < json.length; i++) {
      var pt = json[i];
      var deviation = pt[2];

      //Temporarily remove some data points
      if(i % 2 != 0) { 
        continue;
      }

      if(deviation < 0) 
        continue;

      var geo = {"geometry": {"type": "Point", "coordinates": [ pt[1], pt[0] ]}, "id": i,
        "properties": data_pulse_prop(deviation) };

      data.push(geo);
    }

    data.push( {"geometry": {"type": "Point", "coordinates": [ -73.981826, 40.768094]}, "id": 100, 
      "properties": data_pulse_prop(0) } );
  

    cb(null, data);
  });

};


/* Test different parameters */
function queryParams() {
  var urlParams = {};
  (function () {
      var match,
          pl     = /\+/g,  // Regex for replacing addition symbol with a space
          search = /([^&=]+)=?([^&]*)/g,
          decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
          query  = window.location.search.substring(1);

      while (match = search.exec(query))
         urlParams[decode(match[1])] = decode(match[2]);
  })();

  return urlParams;
}

/* Set up defaults */
var start_scale = 1;
var pulse_rate = 2000;
var scale_factor = 120;

var pulse_on_no_dev = false;

var urlParams= queryParams();

if(urlParams.start_scale >= 0) {
  console.log(urlParams.start_scale);
  start_scale = urlParams.start_scale;
}

//NOT USED
if(urlParams.pulse_rate >= 0) 
  pulse_rate = urlParams.pulse_rate;

if(urlParams.scale_factor >= start_scale)
  scale_factor = urlParams.scale_factor;


/* Map Initiating Pulse Layer */
var pulseLayer = d3layer(); 

/* Set up map, add pulse layer, get data, animate data */
$(window).ready(function() {
  mapbox.auto('map', 'jetfault.map-v3kayr3j', function(map) {
    map.center({ lat: 40.75275880391166, lon: -73.97139047965452 });
    map.zoom(13, true);

    fetch_data(function(error, data) {
      pulseLayer.data(data);
      pulseLayer.animate(earthquake);
      map.addLayer(pulseLayer);
      map.extent(pulseLayer.extent());
    });


  });
});
