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
});