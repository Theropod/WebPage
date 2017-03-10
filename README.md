# WebPage
Web Page Test for Map Feature Display, and Some Simple Interactions
* **注意：翻墙问题**  
  这里用的是默认的域名，所以必须用https，为了不想看见报错，我就把html里的中国访问的http的google api 地址注掉，改成的需要翻墙了的。
* 这个page的地址：[https://theropod.github.io/WebPage/](https://theropod.github.io/WebPage/)
* 关于投影 先用ArcGIS对原来的shanpefile做了投影转换，因为我发现geojson的边界和底图稍微有点对不上，猜测是因为此geojson的源shapefile之地理坐标系采用克拉索夫斯基椭球体，和WGS84还是又一些差别。
* 这个版本操作的数据本来就放在github或者我的GIST里面，而非geoserver，因此加载效率上保证不了。现在的做法是基本的边界数据用geoserver发布服务，新绘制的部分保存成json，并用geovts转成图片。所以这个分支下的页面应该是不会再更新了。
