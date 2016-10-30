angular.module('starter.directives', [])
    
.directive('ngFiles', function ($parse) {
    return {
        link: function(scope, element, attrs) {
            var onChange = $parse(attrs.ngFiles);
            element.on('change', function (event) {
                onChange(scope, { $files: event.target.files });
            });
        }
    }
})

.directive('map', function () {
    return {
        scope: {
            options: "=?map"
        },
        link: function(scope, element, attrs) {
            var latLng = new google.maps.LatLng(scope.options.latitude, scope.options.longitude);
            var mapOptions = {
                center: latLng,
                zoom: 16,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            var id = element.attr("id");
            if(!id){
                id = "map" + (new Date()).getTime();
                element.attr("id", id);
            }
            var map = new google.maps.Map(document.getElementById(id), mapOptions);
            var marker = new google.maps.Marker({
                map: map,
                animation: google.maps.Animation.DROP,
                position: latLng
            });   
        }
    }
});