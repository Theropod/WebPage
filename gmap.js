//OSM是最下层layer,上面是vectorlayer显示countries，再上面是featureoverlay
//所有用到google map api的都在这ShowingMap的一个函数里，这个函数名写道使用api的那一句里面。
var gmap;

/**
 * 定义一个openlayers的map，作为control加到GoogleMap上面
 * This constructor takes the DIV as an argument.
 * @constructor
 */
function OlMap_GmapControl(ControlDiv, gmap) {
    var olMapDiv = document.createElement('div');
    olMapDiv.id = "olMapDiv";

    var style = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.1)'
        }),
        stroke: new ol.style.Stroke({
            color: '#FFFF00',
            width: 1
        }),
        text: new ol.style.Text({
            font: '12px Calibri,sans-serif',
            fill: new ol.style.Fill({
                color: '#000'
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 3
            })
        })
    });


    var geojsonObject = 'data/852English.geojson';
    var vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            //测试用，就用了python的http.server
            url: 'https://gist.githubusercontent.com/Theropod/0c921843d7126edfccd6b670f0c53edd/raw/2f87db27b47d1b853f815f34a65ee98c7bede97e/map.geojson',
            format: new ol.format.GeoJSON()
        }),
        style: function(feature, resolution) {
            // style.getText().setText(resolution < 5000 ? feature.get('name') : '');
            return style;
        }
    });

    var view = new ol.View({
        // make sure the view doesn't go beyond the 22 zoom levels of Google Maps
        maxZoom: 21,
        projection: 'EPSG:3857', //EPSG:4326代表WGS84下的经纬度坐标，但是这样用的话地图会变扁（它仅仅是地理坐标系）。默认的情况是WGS84 Web Mercator EPSG:3857，这个是投影坐标系。
        //这个是(120°E,40°N)的投影坐标。先longtitude后latitude，和google map的坐标定义正相反
        //初始view的位置
        center: [13358338.8952, 4865942.2795],
        zoom: 8
    });
    view.on('change:center', function() {
        //gmap的setCenter直接用的经纬度，要转换一下。
        var center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
        gmap.setCenter(new google.maps.LatLng(center[1], center[0]));
    });
    view.on('change:resolution', function() {
        var zoom = view.getZoom();
        //openlayers第一次getzoom的值居然不是整数，googlemap会报错，之后又调用这个函数，openlayers获取成整数，gmap正常zoom。
        //而要是把gmap的zoom直接上/下取整，两个层放大或缩小的动画效果会脱节。所以这样判断一下，改为对openlayers的zoom值取整。
        if (zoom > gmap.getZoom()) {
            view.setZoom(Math.ceil(zoom));
        } else if (zoom < gmap.getZoom()) {
            view.setZoom(Math.floor(zoom));
        } else {}
        gmap.setZoom(view.getZoom());
    });

    //map
    var olmap = new ol.Map({
        layers: [vectorLayer],
        interactions: ol.interaction.defaults({
            altShiftDragRotate: false,
            dragPan: false,
            rotate: false
        }).extend([new ol.interaction.DragPan({
            kinetic: null
        })]),
        target: olMapDiv,
        view: view
    });


    // 在viewport节点下添加一个Card
    var viewport = olmap.getViewport();
    $(viewport).append(document.getElementById("card"));

    var highlightStyleCache = {};
    var featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector(),
        //	"map: map" Sets the layer as overlay on a map. The map will not manage this layer in its layers collection,
        //and the layer will be rendered on top. This is useful for temporary layers. 
        //However,the standard way to add a layer to a map and have it managed by the map is to use ol.Map#addLayer.
        map: olmap,
        //因为是用了哪一个Region才将其加进featureoverlay的source，所以想给source里新的feature单独设置style的时候这样的Cache比较方便。          
        style: function(feature, resolution) {
            // var text = resolution < 5000 ? feature.get('name') : '';
            var text = '';
            if (!highlightStyleCache[text]) {
                highlightStyleCache[text] = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#f00',
                        width: 1
                    }),
                    //使鼠标放上去是透明的红色
                    fill: new ol.style.Fill({
                        color: 'rgba(255,0,0,0.1)'
                    }),
                    text: new ol.style.Text({
                        font: '12px Calibri,sans-serif',
                        text: text,
                        fill: new ol.style.Fill({
                            color: '#000'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#f00',
                            width: 3
                        })
                    })
                });
            }
            return highlightStyleCache[text];
        }
    });

    //事件响应

    var highlight;
    var displayFeatureInfo = function(pixel) {

        var feature = olmap.forEachFeatureAtPixel(pixel, function(feature) {
            return feature;
        });

        var info = document.getElementById('info');
        if (feature) {
            info.innerHTML = feature.get('Name') + ': ' + feature.get('OBJECTID');
        } else {
            info.innerHTML = '&nbsp;';
        }

        //鼠标移到别的feature上面的时候，从featureoverlay的source里更换被highlight的feature
        if (feature !== highlight) {
            if (highlight) {
                featureOverlay.getSource().removeFeature(highlight);
            }
            if (feature) {
                featureOverlay.getSource().addFeature(feature);
            }
            highlight = feature;
        }
    };

    olmap.on('pointermove', function(evt) {
        if (evt.dragging) {
            return;
        }
        var pixel = olmap.getEventPixel(evt.originalEvent);
        displayFeatureInfo(pixel);
    });

    olmap.on('click', function(evt) {
        displayFeatureInfo(evt.pixel);
    });

    //把上面定义的olMapDiv给Append到构造函数传入的父Div上面
    ControlDiv.appendChild(olMapDiv);
    //不update的话canvas还是会变成display:none
    olmap.updateSize();
}

function ShowingMap() {
    gmap = new google.maps.Map(document.getElementById('gmap'), {
        mapTypeId: 'satellite',
        zoom: 8,
        center: {
            lat: 40,
            lng: 120
        },
        disableDefaultUI: true,
        keyboardShortcuts: false,
        draggable: false,
        disableDoubleClickZoom: true,
        scrollwheel: false,
        streetViewControl: false
    });
    // Create the DIV to hold the control and call the OlMap_GmapControl() constructor
    // passing in this DIV.
    var olMap_gmapControl = new OlMap_GmapControl(ControlDiv, gmap);
    gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(ControlDiv);
    ControlDiv.parentNode.removeChild(ControlDiv);
}