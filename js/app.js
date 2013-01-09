var map, pointarray, heatmap, heatmap_neg;

var info_window = new InfoBubble({
  minWidth: 280,
  minHeight: 280,
  arrowStyle: 0,
  arrowPositon: 96,
  arrowSize: 13,
  borderRadius: 0,
  backgroundClassName: 'iw'});
    
var venues = [];

var venue_data = [];
var venue_data_neg = [];

var heatRadiusZoom = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 20, 30, 55, 105, 200, 377.7, 734.567, 1400];

//IF we should display instagram data or 4sq
var instagram = false;


function setHeatmap(instagram) {
	var my_url = 'http://' + window.location.host + '/citybeat-backend';
	var crawler_url = my_url + '/get_foursquare_heatmap';

  if(instagram) {
    crawler_url = my_url + '/get_instagram_heatmap';
  }

	venue_data = [];
  venue_data_neg = [];

	$.ajax({
		url : crawler_url,
		type : 'GET',
		success : function(data) {
			venues = $.parseJSON(data);
			for(var i = 0; i < venues.length; i++) {
				var venue = venues[i];
				var lat = venue[0];
				var lon = venue[1];
        var percent = venue[2];
        var venue_heat = {location: new google.maps.LatLng(lat, lon), weight: percent};

				if(percent > 0) {
					venue_data.push(venue_heat);
				} else if(percent < 0) {
          venue_heat.weight *= -1;
          venue_data_neg.push(venue_heat);
        }
			}

			heatmap.setData(new google.maps.MVCArray(venue_data));
      heatmap_neg.setData(new google.maps.MVCArray(venue_data_neg));
		},
    error : function() {
      console.log('error getting data');
    }
	});
}


function setInfoContent(infoWindow, lat, lng) {

  /* Function for getting Euclidean distance */
  var distance = function(lat1, lng1, lat2, lng2) {
    return Math.abs(Math.sqrt( Math.pow((lat2-lat1), 2) + Math.pow((lng2-lng1), 2)));
  };

  /* Function to get closest lat_lng point */
  var getClosestPoint = function(lat, lng) {
    var smallest_dist;
    var closest_box = [];
    for(var i = 0; i < venues.length; i++) {
      var lat2 = venues[i][0];
      var lng2 = venues[i][0];
      var dis = distance(lat, lng, venues[i][0], venues[i][1]);
      smallest_dist = smallest_dist ? smallest_dist : dis;

      if(dis <= smallest_dist) {
        closest_box = venues[i];
        smallest_dist = dis;
      }
    }

    return closest_box;
  };

  var getImages = function(lat, lng, cb) {
    var images = [{title: "Times Square Sample Pic", url: "http://www.visitingdc.com/images/times-square-picture.jpg"}, {title: "Times Square Sample Pic 2", url: "http://www.visitingdc.com/images/times-square-picture.jpg"}];

    cb(images);
  };

  /* Done FUNCTIONS */


  /* Loading IMAGES */

  getImages(lat, lng, function(images) {
    if(!images) {
      console.log('No images found');
      return;
    }

    /* Create HTML */
    var image_lightboxes = '';
    for(var i = 0; i < images.length; i++) {
      var a_box = '<a href="' + images[i].url + '" class="lightbox" title="' +
        images[i].title + '"></a>';

      image_lightboxes += a_box;
    }

    $(".iw-lightbox").html(image_lightboxes);

    $(".iw-lightbox>a:first").html('<img src="' + images[0].url + '">');
  });

  /* Done Loading IMAGES */


  /* Percent Change */

  var loc_data = getClosestPoint(lat, lng);
  var percent = loc_data[2]*100;

  var direction;
  if(percent == 0) {
    direction = 'arrow-minus';
  } else if(percent > 0) {
    direction = 'arrow-up';
  } else if(percent < 0) {
    direction = 'arrow-down';
  }

  console.log(direction);

	$(".iw-percent>.arrow").removeClass('arrow-down arrow-up arrow-minus').addClass(direction);

  $(".iw-percent>.percentage").html(Math.abs(Math.round(percent)) + "%");
  /* Done Percent Change */

  var content = $("#iw-body").prop('outerHTML');
  $(".iw-lightbox").html('');
  content = $(content).css('display', 'block');

	console.log((content).prop('outerHTML'));
  //infoWindow.setContent($("#iw-body"));
  infoWindow.setContent($(content).prop('outerHTML'));
}

function onZoomChange(event) {
	var currZoomLevel = map.getZoom();

	var newHeatRadius;
	if(currZoomLevel >= heatRadiusZoom.length) {
		newHeatRadius = heatRadiusZoom[heatRadiusZoom.length - 1];
	} else {
		newHeatRadius = heatRadiusZoom[currZoomLevel];
	}
	//console.log("Radius: " + newHeatRadius + " ZoomLevel: " + currZoomLevel);

	heatmap.setOptions({radius: newHeatRadius });
	heatmap_neg.setOptions({radius: newHeatRadius });
}

function onMouseClick(event) {
  
  //Close the old window
  if(info_window.isOpen()) {
    info_window.close();
    return;
  }

	var lat = event.latLng.lat();
	var lng = event.latLng.lng();
	console.log("Lat: " + lat);
	console.log("Lng: " + lng);


	setInfoContent(info_window, lat, lng);

  info_window.setPosition(event.latLng);
  info_window.open(map);

  setTimeout(function(){$("a.lightbox", info_window.bubble_).lightBox();}, 1000);
}

function initialize() {

	var mapOptions = {
		zoom: 13,
		center: new google.maps.LatLng(40.740737, -73.959961),
		mapTypeId: google.maps.MapTypeId.ROADMAP,
	};

  var styles = [
    {
      "elementType": "geometry.fill",
      "stylers": [
        { "lightness": -48 },
        { "saturation": -80 }
      ]
    },
    {
      "featureType": "road",
      "stylers": [
        { "visibility": "simplified" },
        { "hue": "#00c3ff" },
        { "saturation": -8 }
      ]
    },
    {
      "featureType": "transit",
      "stylers": [
        { "visibility": "off" }
      ]
    },
    {
      "featureType": "administrative",
      "stylers": [
        { "visibility": "on" },
        { "weight": 0.1 },
        { "saturation": -100 },
        { "lightness": 91 }
      ]
    }
  ];

	lastZoomLevel = 13;

	map = new google.maps.Map(document.getElementById('map_canvas'),
			mapOptions);

  map.setOptions({styles:styles});

	google.maps.event.addListener(map, 'zoom_changed', onZoomChange);
	google.maps.event.addListener(map, 'click', onMouseClick);

	pointArray = new google.maps.MVCArray();

	heatmap = new google.maps.visualization.HeatmapLayer({
		data: pointArray,
	});

	heatmap_neg = new google.maps.visualization.HeatmapLayer({
		data: pointArray,
	});

	var gradient_pos = [
    /*
    'rgba(0, 255, 255, 0)',
    'rgba(0, 255, 255, 0.1)',
    'rgba(0, 191, 255, 0.2)',
    'rgba(0, 127, 255, 0.5)',
    'rgba(0, 63, 255, 0.8)',
    'rgba(0, 0, 255, 1)',
    'rgba(0, 0, 223, 1)',
    'rgba(0, 0, 191, 1)',
    'rgba(0, 0, 159, 1)',
    'rgba(0, 0, 127, 1)',
    'rgba(63, 0, 91, 1)',
    'rgba(127, 0, 63, 1)',
    'rgba(191, 0, 31, 1)',
    'rgba(255, 0, 0, 1)'
    */
      'rgba(0, 0, 0, 0)',
      'rgba(150, 0, 0, 0.3)',
      'rgba(150, 0, 0, 0.6)',
      'rgba(180, 0, 0, 0.8)',
      'rgba(200, 0, 0, 0.9)',
      'rgba(255, 0, 0, 1)'
		];

    var gradient_neg = [
      'rgba(0, 0, 0, 0)',
      'rgba(0, 155, 100, 0.2)',
      'rgba(0, 120, 150, 0.5)',
      'rgba(0, 70, 180, 0.7)',
      'rgba(0, 50, 200, 0.9)',
      'rgba(0, 0, 255, 1)'
    ];

		heatmap.setOptions({
			gradient: gradient_pos
		});
    heatmap_neg.setOptions({
      gradient: gradient_neg
    });

	heatmap.setOptions({radius: 55});
	heatmap_neg.setOptions({radius: 55});

	lastHeatRadius = 50;

	heatmap.setMap(map);
  heatmap_neg.setMap(map);
  changeDataType(instagram);
	setHeatmap();
}

function toggleHeatmap() {
	heatmap.setMap(heatmap.getMap() ? null : map);
}

function changeOpacity() {
	heatmap.setOptions({opacity: heatmap.get('opacity') ? null : 0.8});
}

function changeData() {
  console.log(instagram);
    instagram = !instagram;
    setHeatmap(instagram);
    changeDataType(instagram);
}

function changeDataType(instagram) {
  var button_text = "Display " + (instagram ? "FourSquare" : "Instagram" ) + " Data";
  $("#changeData").html(button_text);
}
