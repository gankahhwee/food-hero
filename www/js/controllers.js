angular.module('starter.controllers', [])

.controller('MainCtrl', function($rootScope, $state, $location, AuthService) {
    var authCheck = function(){
      if(!$state.current.disableAuthCheck){
        if(!AuthService.user()){
          //$state.go('login');
          $location.path('/login');
        }
      }
    }
    $rootScope.$on("$locationChangeSuccess", authCheck);
    authCheck();
})

.controller('MapCtrl', function($scope, $state, Events, Location, $location, $timeout) {
  var options = {timeout: 10000, enableHighAccuracy: true},
      markers = [],
      infoWindows = [],
      events, 
      init;
    
  var addMarker = function(latLng, event){
    var marker = new google.maps.Marker({
      map: $scope.map,
      animation: google.maps.Animation.DROP,
      position: latLng
    });   
    markers.push(marker);

    /*var infoWindow = new google.maps.InfoWindow({content: content});
    infoWindows.push(infoWindow);*/

    if(event){
      marker.addListener('click', function () {
        /*for(var i=0;i<infoWindows.length;i++){
          infoWindows[i].close();
        }
        infoWindow.open($scope.map, marker);*/
        $timeout(function(){
          $location.path("/event/"+event.id);
        });
      });
    }
  }
 
  Location.getCurrentPosition().then(function(position){
  
    var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    var mapOptions = {
      center: latLng,
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

    var initMarkers = function(){
      if(markers.length > 0) return;
      //addMarker(latLng);
      //var GeoMarker = new GeolocationMarker($scope.map);
    }

    var loadedListener = $scope.map.addListener('idle',function(){
      initMarkers();
    });
      
    Events.find(position.coords.latitude, position.coords.longitude, 30000, true).then(
      function(data){
        events = data.events;
        for(var i=0;i<data.events.length;i++){
          var event = data.events[i];
          var content = '<h4>'+event.roomname+'</h4>'+
                '<p>Ending at '+event.endtime+'</p>'+
                '<p>'+event.distance+' km away</p>'+
                '<p>'+event.location+'</p>'+
                '<p>Type: '+event.foodtype+'</p>'+
                '<p>Servings: '+event.servings+'</p>'+
                '<p>By @'+event.username+'</p>'+
                '<p><a href="#/event/'+event.id+'">Read more</a></p>';
          var latLng = new google.maps.LatLng(data.events[i].latitude, data.events[i].longitude);
          addMarker(latLng, event);
        }
      }
    ); 
  })
  
  $scope.shareFood = function(){
    $location.path("/post");
  }
})

.controller('EventCtrl', function($scope, $stateParams, Events, $ionicLoading) {
    $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
      viewData.enableBack = true;
    }); 
    $ionicLoading.show({
      template: 'Loading...'
    })
    Events.get($stateParams.id).then(function(data){
      $ionicLoading.hide();
      $scope.event = data.event;
    });
})

.controller('EventsCtrl', function($scope, Events) {
  //$scope.events = Events.all();
})

.controller('PostEventCtrl', function($scope, Events, $ionicLoading, Location, $location) {
  $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
    viewData.enableBack = true;
  }); 
  Location.getCurrentPosition().then(function(position){
    var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    var map = new google.maps.Map(document.getElementById("map"), {
      center: latLng,
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    var marker = new google.maps.Marker({
      map: map,
      position: latLng
    });
      
    $scope.geocode = function(address){
      Location.geocodeAddress(address, function(results){
        $scope.event.latitude = results[0].geometry.location.lat();
        $scope.event.longitude = results[0].geometry.location.lng();
        map.setCenter(results[0].geometry.location);
        marker.setMap(null);
        marker = new google.maps.Marker({
          map: map,
          position: results[0].geometry.location
        });
      });
    };
  });
  $scope.event = {
      roomname: 'Fried rice and chicken nuggets',
      location: '420 Canberra Road',
      contact: '93374226',
      foodtype: 'Halal',
      servings: '8 people',
      endtime: '2016-10-31 23:59',
      additionalInfo: 'Please bring your own containers. Thanks'
  };
  var data = new FormData();
  $scope.getTheFiles = function ($files) {
    angular.forEach($files, function (value, key) {
      data.append("allImages[0]", value);
    });
  };
  $scope.post = function(){
    $ionicLoading.show({
      template: 'Loading...'
    })
    for(attr in $scope.event){
      data.append(attr, $scope.event[attr]);
    }
    Events.add(data).then(function(data){
      $ionicLoading.hide();
      if(data.id){
        $location.path("/event/"+data.id);
      }
    });
  }
})

.controller('AuthCtrl', ['$scope', 'AuthService', '$ionicLoading', '$ionicPopup', '$state',
    function($scope, AuthService, $ionicLoading, $ionicPopup, $state) {
  $scope.appName = "Food Hero";
    
  $scope.register = function(username, email, password){
      $ionicLoading.show({
        template: 'Loading...'
      })
      AuthService.register(username, email, password).then(function(result){
          $ionicLoading.hide();
          if(result.success){
              $state.go('login').then(function(){
                $ionicPopup.alert({
                  title: 'Registration successful',
                  template: 'Yay! You can login to use our app now :)'
                });
              });
          } else {
              $ionicPopup.alert({
                 title: 'Registration unsuccessful',
                 template: result.error
              });
          }
      });
  }
  
    $scope.login = function (username, password) {
        $ionicLoading.show({template: 'Logging in...'});

        AuthService.login(username, password)
        .then(function () {
            $state.go('tab.map').then(function () {});
        }, function (error) {
            $ionicPopup.alert({
                title: "Login error",
                template: error
            });
        })
        .finally(function() {
            $ionicLoading.hide();
        });
    };

    $scope.loginWithFacebook = function () {
        AuthService.loginFB()
        .then(function(token) {
            $ionicLoading.show({template: 'Logging in...'});
            return AuthService.getFBProfile(token);
        })
        .then(AuthService.loginFBServer)
        .then(function (result) {
            $state.go('tab.map').then(function () {});
        }, function (error) {
            $ionicPopup.alert({
                title: 'Login error',
                template: error
            });
        })
        .finally(function() {
            $ionicLoading.hide();
        });
    };
}])

.controller('ProfileCtrl', ['$scope', 'AuthService', '$ionicLoading', '$ionicPopup', '$state',
function($scope, AuthService, $ionicLoading, $ionicPopup, $state) {
    $scope.logout = function() {
      if (typeof(Storage) != "undefined") {
          localStorage.removeItem("token");
      }
      
      // to be completed
      
      $state.go('login');
  }
}]);
