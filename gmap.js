//OSM是最下层layer,上面是vectorlayer显示countries，再上面是featureoverlay
//所有用到google map api的都在这ShowingMap的一个函数里，这个函数名写道使用api的那一句里面。
/**
 * 定义一个openlayers的map，作为control加到GoogleMap上面
 * This constructor takes the DIV as an argument.
 * @constructor
 */
var olmap;

function OlMap_GmapControl() {
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

    olmap = new ol.Map({
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

    window.onload = (function() {
        olmap.updateSize();
    });

    window.onresize = function() {
        setTimeout(function() {
            olmap.updateSize();
        }, 200);
    };
    //Vectorlayer-----------------------------------------------------------------------
    var wmsVectorSource = new ol.source.TileWMS({
        url: 'http://125.211.217.107:8080/geoserver/FarmTest/wms',
        params: {
            STYLES: '',
            LAYERS: 'FarmTest:852Reprojected',
        }
    });
    var VectorLayer = new ol.layer.Tile({
        source: wmsVectorSource,
    });

    olmap.addLayer(VectorLayer);
    //设置一下显示顺序
    VectorLayer.setZIndex(4);

    //ImageLayer，影像-----------------------------------------------------------------------

    //显示来自我的geoserver的栅格影像
    var wmsImageSource = new ol.source.TileWMS({
        url: 'http://125.211.217.107:8080/geoserver/FarmTest/wms',
        params: {
            STYLES: '',
            LAYERS: 'FarmTest:852_0528dd',
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
        projection: 'EPSG:3857'
    });

    var ImageLayer = new ol.layer.Tile({
        source: wmsImageSource
    });

    olmap.addLayer(ImageLayer);
    ImageLayer.setZIndex(3);

    //BingMapLayer------------------------------------------------------------------------
    var BingMapLayer = new ol.layer.Tile({
        source: new ol.source.BingMaps({
            key: 'AkBEXLYvXsP72ec2inDTdTCQZ-VnYMYmvNP2ekQ-Kj4X0Keif3xhItjejWqKlqyJ',
            imagerySet: 'Aerial',
            maxZoom: 19
        })
    });
    //OSMLayer，影像-----------------------------------------------------------------------
    var OSMLayer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    //controls-----------------------------------------------------------------------   
    var data;
    var myPie;
    var myChart;
    //echarts在建立图表的时候要确定一个已经存在的node，要是把echarts.init放在默认是最后执行的fetch里面的话由于之前定义的结点已经被整体移动过，到了viewport下面，会报一个找不到结点的错误。
    myChart = echarts.init(document.getElementById('Line'));
    myPie = echarts.init(document.getElementById('Pie'));
    var url = 'https://raw.githubusercontent.com/Theropod/WebPage/gh-pages/data/' + '农场1.json';
    //这个fetch也是在执行完所有之后的js之后才去获取json的，这就要求服务器返回一个总的json，直接用它
    fetch(url).then(function(response) {
        return response.json();
    }).then(function(json) {
        data = json;
        var stat = [data[0].好, data[0].中, data[0].差, data[0].日期];
        // 指定图表的配置项和数据
        var optionline = {
            title: {
                text: data[0].农场 + '长势比较'
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
                data: $.map(data, function(item) {
                    return item.日期;
                })
            },
            yAxis: {
                type: 'value'
            },
            // dataZoom: [
            //     {
            //     startValue: '2017-05-18'
            // }, 
            // {
            //     type: 'inside'
            // }],
            backgroundColor: '#ffffff',
            series: [{
                name: '今年长势',
                type: 'line',
                data: $.map(data, function(item) {
                    return item.今年长势;
                })
            }, {
                name: '往年平均长势',
                type: 'line',
                data: $.map(data, function(item) {
                    return item.多年平均;
                })
            }, ]
        };

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(optionline);

        optionPie = {
            title: {
                text: stat[3] + '好中差',
                x: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: "{a} <br/>{b} : {c} ({d}%)"
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                data: ['好', '中', '差']
            },
            backgroundColor: '#ffffff',
            series: [{
                name: '长势好坏统计',
                type: 'pie',
                radius: '55%',
                center: ['50%', '60%'],
                data: [{
                    value: stat[0],
                    name: '好'
                }, {
                    value: stat[1],
                    name: '中'
                }, {
                    value: stat[2],
                    name: '差'
                }],
                itemStyle: {
                    emphasis: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        myPie.setOption(optionPie);
    });
    myChart.on('click', function(params) {
        stat = [data[params.dataIndex].好, data[params.dataIndex].中, data[params.dataIndex].差, data[params.dataIndex].日期];
        myPie.setOption({
            title: {
                text: stat[3] + '好中差',
            },
            series: [{
                data: [{
                    value: stat[0],
                    name: '好'
                }, {
                    value: stat[1],
                    name: '中'
                }, {
                    value: stat[2],
                    name: '差'
                }],
            }]

        });
    });

    window.onresize = function() {
        setTimeout(function() {
            myChart.resize();
            myPie.resize();
        }, 200);
    };

    $('.sidebar-right .card-title').on('click', 'a', function() {
        if ($('#Chartpane').hasClass('show')) {} else {
            //等card展开完了再resize,否则charts没有显示的地方
            setTimeout(function() {
                myChart.resize();
                myPie.resize();
            }, 200);
        }
    });

    //交互-----------------------------------------------------------------------
    //用来高亮的Layer
    var drawnfeatures = new ol.Collection();
    var featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector({ features: drawnfeatures }),
        //因为是用了哪一个Region才将其加进featureoverlay的source，所以想给source里新的feature单独设置style的时候这样的Cache比较方便。          
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(255,0,0,1)',
                width: 3
            }),
            //使鼠标放上去是透明的红色
            fill: new ol.style.Fill({
                color: 'rgba(255,0,0,0.3)'
            })
        })
    });
    olmap.addLayer(featureOverlay);
    featureOverlay.setZIndex(5);

    //存全部的高亮的地块
    var highlight = [];

    //点击选择，再点取消选择
    olmap.on('singleclick', function(evt) {
        if (editFlag) {
            return;
        }
        var viewResolution = (view.getResolution());
        //请求jsonp，不会有跨域访问的问题
        var url = wmsVectorSource.getGetFeatureInfoUrl(
            evt.coordinate, viewResolution, 'EPSG:3857', {
                'INFO_FORMAT': 'text/javascript'
            });

        var selectedfeatureid;
        if (url) {
            // 得到选择的feature的信息,
            // json格式
            $.ajax({             
                type: "get",
                url:  url,
                //ajax默认是异步的，所以嵌套请求的时候后面的请求用到前面请求结果的话，后面的请求得不到数据。。。
                //这样把异步关了的缺点是会锁死网页，得到数据才会继续。但是这里没有用WFS+WMS嵌套请求，不用管了。
                // async:'false',
                dataType:   "jsonp",
                jsonp:   "callback",
                jsonpCallback: "parseResponse",
                success:   function(data) {
                    $.each(data.features, function(index, value) {
                        $.each(value.properties,
                            function(key, propertyvalue) {
                                if (key == 'OBJECTID') {
                                    var info = document.getElementById('info');
                                    info.innerHTML = key + ": " + propertyvalue;
                                }
                            });
                        selectedfeatureid = value.id;
                        //得到选择的feature,json格式
                        if (selectedfeatureid) {
                            tmptext = '<br>' + 'geoserverID:' + selectedfeatureid;
                            info.innerHTML += tmptext;
                            var ParcelsGeometry = document.getElementById('ParcelsGeometry');
                            var selectedfeature = { id: selectedfeatureid, geometry: new ol.format.GeoJSON().readFeature(value.geometry) };
                            var highlightfeatureindex = -1;
                            //只列出来id
                            function geometryreplacer(key, value) {
                                if (key === "geometry") {
                                    return undefined;
                                }
                                return value;
                            }
                            for (var i = 0; i < highlight.length; i++) {
                                if (highlight[i].id == selectedfeatureid) {
                                    highlightfeatureindex = i;
                                    break;
                                }
                                highlightfeatureindex = -1;
                            }
                            if (highlightfeatureindex != -1) {
                                //我猜测，即使对同一个服务器返回的feature,每一次执行openlayers的readfeature的时候得到的结果都有不同。因此若是保存了服务器返回的feature,readfeature之后再用remove的话会报错，只有保存了进入source的那个readfeature的结果才能正确进行remove。
                                featureOverlay.getSource().removeFeature(highlight[highlightfeatureindex].geometry);
                                highlight.splice(highlightfeatureindex, 1);
                                alert('移除 ' + 'geoserverID:' + selectedfeatureid);
                                //readFeature出来的结果不能stringify,也不知道为什么。只有geoserver返回的那个东西可以stringfy，但是不显示坐标的话highlight里面存readfeature出来的应该没问题。
                                ParcelsGeometry.innerHTML = JSON.stringify(highlight, geometryreplacer);
                            } else {
                                featureOverlay.getSource().addFeature(selectedfeature.geometry);
                                highlight.push(selectedfeature);
                                olmap.getView().fit(featureOverlay.getSource().getExtent());
                                alert('加入 ' + 'geoserverID:' + selectedfeatureid);
                                ParcelsGeometry.innerHTML = JSON.stringify(highlight, geometryreplacer);
                            }
                        }
                    });
                },
                error:   function() {                 
                    alert('fail reading feature');             
                }         
            });
        }
    });

    //画多边形
    var editFlag = false;
    var modify = new ol.interaction.Modify({
        //modify必须设置features为ol.CollectionI格式，而不能像draw一样设置一个source
        features: drawnfeatures,
        // the SHIFT key must be pressed to delete vertices, so
        // that new vertices can be drawn at the same position
        // of existing vertices
        deleteCondition: function(event) {
            return ol.events.condition.shiftKeyOnly(event) &&
                ol.events.condition.singleClick(event);
        }
    });
    var draw = new ol.interaction.Draw({
        // source:featureOverlay.getSource(),
        features: drawnfeatures,
        type: 'Polygon'
    });

    // olmap.on('pointermove', function(evt) {
    //     if (evt.dragging) {
    //         return;
    //     }
    //     var pixel = olmap.getEventPixel(evt.originalEvent);
    //     displayFeatureInfo(pixel);
    // });

    //工具条
    $('#checkBingMap').change(function() {
        if (this.checked) {
            olmap.addLayer(BingMapLayer);
            BingMapLayer.setZIndex(1);
        } else {
            olmap.removeLayer(BingMapLayer);
        }
        olmap.updateSize();
    });

    $('#checkOSM').change(function() {
        if (this.checked) {
            olmap.addLayer(OSMLayer);
            OSMLayer.setZIndex(2);

        } else {
            olmap.removeLayer(OSMLayer);
        }
        olmap.updateSize();
    });

    $('#checkRS').change(function() {
        ImageLayer.setVisible(this.checked);
    });

    $('#checkVectorTile').change(function() {
        VectorLayer.setVisible(this.checked);
    });

    $('#checkHighlight').change(function() {
        featureOverlay.setVisible(this.checked);
    });

    $('#EditButton').click(function() {
        if (!editFlag) {
            olmap.addInteraction(modify);
            olmap.addInteraction(draw);
            editFlag = true;
            this.innerHTML = '停止编辑';
        } else {
            olmap.removeInteraction(modify);
            olmap.removeInteraction(draw);
            this.setAttribute('aria-pressed', 'false');
            this.innerHTML = '开始编辑';
            editFlag = false;
        }
    });

    //不update的话canvas还是会变成display:none
    ControlDiv.appendChild(olMapDiv);
    olmap.updateSize();
    return olmap;
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
    // Create the DIV to hold the control and call the OlMap_GmapControl() constructor and pass in this DIV.
    olmap = OlMap_GmapControl();
    gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(ControlDiv);
    ControlDiv.parentNode.removeChild(ControlDiv);
}