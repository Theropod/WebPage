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

    var view = new ol.View({
        // make sure the view doesn't go beyond the 22 zoom levels of Google Maps
        maxZoom: 21,
        projection: 'EPSG:3857', //EPSG:4326代表WGS84下的经纬度坐标，但是这样用的话地图会变扁（它仅仅是地理坐标系）。默认的情况是WGS84 Web Mercator EPSG:3857，这个是投影坐标系。
        //这个是(120°E,40°N)的投影坐标。先longtitude后latitude，和google map的坐标定义正相反
        //初始view的位置
        center: [14787201.743938, 5834170.710267],
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
    //再设置一遍center,否则google map 不更新的。
    view.setCenter([14787201.743938, 5834170.710267]);
    //map-----------------------------------------------------------------------

    var olmap = new ol.Map({
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

    //VectorTileLayer-----------------------------------------------------------------------

    var replacer = function(key, value) {
        if (value.geometry) {
            var type;
            var rawType = value.type;
            var geometry = value.geometry;

            if (rawType === 1) {
                type = geometry.length === 1 ? 'Point' : 'MultiPoint';
            } else if (rawType === 2) {
                type = geometry.length === 1 ? 'LineString' : 'MultiLineString';
            } else if (rawType === 3) {
                type = geometry.length === 1 ? 'Polygon' : 'MultiPolygon';
            }

            return {
                'type': 'Feature',
                'geometry': {
                    'type': type,
                    'coordinates': geometry.length == 1 ? geometry : [geometry]
                },
                'properties': value.tags
            };
        } else {
            return value;
        }
    };

    var tilePixels = new ol.proj.Projection({
        code: 'TILE_PIXELS',
        units: 'tile-pixels'
    });

    var VectorTileStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'transparent'
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(255,255,0,0.6)',
            width: 1
        }),
        text: new ol.style.Text({
            font: '12px Calibri,sans-serif',
            fill: new ol.style.Fill({
                color: 'transparent'
            }),
            stroke: new ol.style.Stroke({
                color: 'transparent',
                width: 3
            })
        })
    });

    var VectorTileLayer
    var url = 'https://gist.githubusercontent.com/Theropod/0c921843d7126edfccd6b670f0c53edd/raw/2f87db27b47d1b853f815f34a65ee98c7bede97e/map.geojson';
    fetch(url).then(function(response) {
        return response.json();
    }).then(function(json) {
        //来自geojson-vt的方法
        var tileIndex = geojsonvt(json, {
            //在开源项目上有一个确定缩放等级的网页
            maxZoom: 21, // max zoom to preserve detail on
            tolerance: 3, // simplification tolerance (higher means simpler)
            extent: 4096, // tile extent (both width and height)
            buffer: 64, // tile buffer on each side
            debug: 0, // logging level (0 to disable, 1 or 2)

            indexMaxZoom: 11, // max zoom in the initial tile index
            indexMaxPoints: 100000, // max number of points per tile in the index
            solidChildren: false // whether to include solid tile children in the index
        });
        var vectorSource = new ol.source.VectorTile({
            format: new ol.format.GeoJSON(),
            tileGrid: ol.tilegrid.createXYZ(),
            tilePixelRatio: 16,
            //这个loadFunction本来是要用url来获取data的，但是这里的不需要，没有这个参数了。
            tileLoadFunction: function(tile) {
                var format = tile.getFormat();
                var tileCoord = tile.getTileCoord();
                var data = tileIndex.getTile(tileCoord[0], tileCoord[1], -tileCoord[2] - 1);

                var features = format.readFeatures(
                    JSON.stringify({
                        type: 'FeatureCollection',
                        features: data ? data.features : []
                    }, replacer));
                tile.setLoader(function() {
                    tile.setFeatures(features);
                    tile.setProjection(tilePixels);
                });
            },
            url: 'data:' // arbitrary url, we don't use it in the tileLoadFunction
        });
        VectorTileLayer = new ol.layer.VectorTile({
            source: vectorSource,
            style: VectorTileStyle
        });
        olmap.addLayer(VectorTileLayer);
        VectorTileLayer.setZIndex(2);
    });

    //Vectorlayer-----------------------------------------------------------------------

    //不显示的那一层geojson的style，全是transparent
    var style_vector = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'transparent'
        }),
        stroke: new ol.style.Stroke({
            color: 'transparent'
        }),
        text: new ol.style.Text({
            font: '12px Calibri,sans-serif',
            fill: new ol.style.Fill({
                color: 'transparent'
            }),
            stroke: new ol.style.Stroke({
                color: 'transparent',
                width: 3
            })
        })
    });

    var VectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            //测试用，就用了github的gist
            url: 'https://gist.githubusercontent.com/Theropod/0c921843d7126edfccd6b670f0c53edd/raw/2f87db27b47d1b853f815f34a65ee98c7bede97e/map.geojson',
            format: new ol.format.GeoJSON()
        }),
        style: style_vector
    });

    olmap.addLayer(VectorLayer);
    //设置一下显示顺序
    VectorLayer.setZIndex(3);

    //ImageLayer-----------------------------------------------------------------------

    var imageLayer = new ol.layer.Image({
        opacity: 0.75,
        source: new ol.source.ImageStatic({
            url: 'data/openlayers显示图片.jpg',
            imageSize: [780, 684],
            projection: olmap.getView().getProjection(),
            imageExtent: ol.extent.applyTransform([131.3058, 44.4338, 133.4427, 45.7522], ol.proj.getTransform("EPSG:4326", "EPSG:3857"))
        })
    });

    olmap.addLayer(imageLayer);
    imageLayer.setZIndex(1);

    //controls-----------------------------------------------------------------------   

    // 在viewport节点下添加一个InformatrionCard
    $('#ControlDiv').append('<div id="LandInformation" class="card" style="width: 20rem;"></div>');
    $('#LandInformation').append('<div id="LandInformationText" class="card-block"></div');
    $('#LandInformationText').append('<h4 class="card-title">地块ID：</h4>');
    $('#LandInformationText').append('<p id="info" class="card-text">&nbsp</p>');
    $('#LandInformationText').append('<a href="#" class="btn btn-primary">也许需要一个链接</a>');
    var viewport = olmap.getViewport();
    $(viewport).append(document.getElementById("LandInformation"));

    //echarts的图表
    $('#ControlDiv').append('<div id="Charts" style="width: 600px;height:600px;"></div>');
    $('#Charts').append('<div id="Line" style="width: 600px;height:300px;"></div>');
    $('#Charts').append('<div id="Pie" style="width: 600px;height:300px;"></div>');

    var data;
    var dates = ["20170320", "20170420", "20170518", "20170528", "20170613"]
    for (var i=0,len=dates.length; i<len; i++) {
        var url = 'https://raw.githubusercontent.com/Theropod/WebPage/gh-pages/data/' + dates[i] + '农场1.json';
        fetch(url).then(function(response) {
            return response.json();
        }).then(function(json) {
            data = $.extend({}, json);
        });
    }
    var LineChart = echarts.init(document.getElementById('Charts'));
    var LineOption = {
        title: {
            text: '长势比较'
        },
        tooltip: {
            trigger: 'axis'
        },
        toolbox: {
            feature: {
                saveAsImage: {}
            }
        },
        xAxis: {
            data: $.map(data,function(item) {
                return item[6];
            })
        },
        yAxis: {
            type: 'value'
        },
        dataZoom: [{
            startValue: '2017-05-18'
        }, {
            type: 'inside'
        }],
        series: [{
                name: '今年长势',
                type: 'line',
            data: $.map(data,function(item) {
                    return item[1];
                })
            },
            {
                name: '往年平均长势',
                type: 'line',
            data: $.map(data,function(item) {
                    return item[2];
                })
            },
            // {
            //     name: '情况分类',
            //     type: 'pie',
            //  data: $.map(data,function(item) {
            //         return item[3];
            //     })
            // }
        ]
    };


    //交互-----------------------------------------------------------------------
    //临时Layer
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
                        color: 'rgba(255,0,0,1)',
                        width: 2
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

    // olmap.on('pointermove', function(evt) {
    //     if (evt.dragging) {
    //         return;
    //     }
    //     var pixel = olmap.getEventPixel(evt.originalEvent);
    //     displayFeatureInfo(pixel);
    // });

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
        //刚打开的时候底图是这里的位置，除非在olmap中设置view的center和zoom之后再初始化一遍，因为只有olmap变了才触发事件。
        zoom: 8,
        center: {
            lat: 46.42,
            lng: 132.54
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