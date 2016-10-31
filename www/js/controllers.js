angular.module('starter.controllers', [])

.controller('MainCtrl', function($rootScope, $state, $location, AuthService, $q) {
    var authCheck = function(){
      if(!$state.current.disableAuthCheck){
        if(!AuthService.user()){
          $location.path('/login');
        }
      } else {
        if(AuthService.user()){
          $location.path('/tab/map');
        }
      }
    }
    $rootScope.$on("$stateChangeSuccess", authCheck);
    authCheck();
})

.controller('MapCtrl', function($scope, $state, Events, Location, $location, $timeout, $ionicLoading, $ionicPopup) {
  $ionicLoading.show({template: 'Loading...'});
  var options = {timeout: 10000, enableHighAccuracy: true},
      markers = [],
      infoWindows = [],
      events, 
      init;
    
  var addEventMarker = function(latLng, event){
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
  
  var initMapWithLocation = function(targetLatLng){
    var mapOptions = {
      center: targetLatLng,
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
    var marker = new google.maps.Marker({
      map: $scope.map,
      position: targetLatLng,
      icon: 'img/blue-circle.png'
    });
      
    Events.find(targetLatLng.lat(), targetLatLng.lng(), 30000, true).then(
      function(data){
        $ionicLoading.hide();
        events = data.events;
        for(var i=0;i<data.events.length;i++){
          var event = data.events[i];
          /*var content = '<h4>'+event.roomname+'</h4>'+
                '<p>Ending at '+event.endtime+'</p>'+
                '<p>'+event.distance+' km away</p>'+
                '<p>'+event.location+'</p>'+
                '<p>Type: '+event.foodtype+'</p>'+
                '<p>Servings: '+event.servings+'</p>'+
                '<p>By @'+event.username+'</p>'+
                '<p><a href="#/event/'+event.id+'">Read more</a></p>';*/
          var latLng = new google.maps.LatLng(data.events[i].latitude, data.events[i].longitude);
          addEventMarker(latLng, event);
        }
      }
    );
  }
 
  var initMap = function() {
      Location.getCurrentPosition().then(function(position){
        var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        initMapWithLocation(latLng);

      }, function(message){
        $ionicLoading.hide();

          $scope.data = {};
          var myPopup = $ionicPopup.show({
            title: 'We cannot locate you. Please turn on location service. Otherwise, let us know where you are.',
            template: '<input type="text" ng-model="data.location" placeholder="Postal code, address or building name">',
            scope: $scope,
            buttons: [
              {
                  text: 'Locate again',
                  type: 'button-positive',
                  onTap: function(e) {
                      $ionicLoading.show({template: 'Locating you...'});
                      initMap();
                  }
            },
              {
                text: "I'm here",
                onTap: function(e) {
                  if (!$scope.data.location) {
                    e.preventDefault();
                  } else {
                    Location.geocodeAddress($scope.data.location, function(results){
                      initMapWithLocation(results[0].geometry.location);
                    });
                  }
                }
              }
            ]
          });
      });
  };
    
  initMap();
  
  $scope.shareFood = function(){
      $state.go('post');
  }
})

.controller('EventCtrl', function($scope, $stateParams, Events, $ionicLoading) {
    $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
      viewData.enableBack = true;
    }); 
    $ionicLoading.show({template: 'Loading...'})
    Events.get($stateParams.id).then(function(data){
        $scope.event = data.event;
        return $stateParams.id;
    }).then(Events.isUserGoing).then(function(data) {
        $scope.event.isUserGoing = data.going;
    }).catch(function(error) {
        $ionicPopup.alert({title: 'Loading error', template: error});
    }).finally(function() {
        $ionicLoading.hide();
    });
    
    $scope.toggleGo = function() {
        $ionicLoading.show({template: 'Saving...'});
        $scope.event.isUserGoing = !$scope.event.isUserGoing;
        Events.goingEvent($scope.event).then(function(data) {
        }).catch(function(error) {
            $ionicPopup.alert({title: 'Saving error', template: error});
        }).finally(function() {
            $ionicLoading.hide();
        });
    };
})

.controller('EventsCtrl', function($scope, Events) {
    $scope.isPastEvent = function(event) {
        return event.endtime < new Date();
    };
    
    $scope.isUpcomingEvent = function(event) {
        return event.endtime >= new Date();
    };
    
  Events.getGoingEvents().then(function(events){
      $scope.events = events;
  });
})

.controller('PostEventCtrl', function($scope, Events, $ionicLoading, Location, $location, $timeout) {
  $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
    viewData.enableBack = true;
  }); 
  $scope.event = {
      /*roomname: 'Fried rice and chicken nuggets',
      location: '420 Canberra Road',
      contact: '93374226',
      foodtype: 'Halal',
      servings: '8 people',
      endtime: '2016-10-31 23:59',
      additionalInfo: 'Please bring your own containers. Thanks'*/
  };
  Location.getCurrentPosition().then(function(position){
    var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    var map = new google.maps.Map(document.getElementById("event-post-map"), {
      center: latLng,
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    var marker = new google.maps.Marker({
      map: map,
      position: latLng
    });
    $scope.event.latitude = position.coords.latitude;
    $scope.event.longitude = position.coords.longitude;
    Location.reverseGeocode(latLng, function(results){
      $timeout(function(){
        $scope.event.location = results[0].formatted_address;
      });
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
  }, function(message){
      alert(message);
  });
  var data = new FormData();
  $scope.getTheFiles = function ($files) {
    angular.forEach($files, function (value, key) {
      data.append("allImages[0]", value);
    });
  };
  $scope.post = function(){
    $ionicLoading.show({
      template: 'Posting...'
    })
    for(attr in $scope.event){
      data.append(attr, $scope.event[attr]);
    }
    Events.add(data, $scope.event).then(function(data){
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
        .then(function () {
            $state.go('tab.map').then(function () {});
        }, function (error) {
            if (error != 'canceled')
                $ionicPopup.alert({
                    title: 'Login error',
                    template: error
                });
        })
        .finally(function() {
            $ionicLoading.hide();
        });
    };
        
    $scope.loginWithGoogle = function () {
        AuthService.loginGG()
        .then(function(params) {
            $ionicLoading.show({template: 'Logging in...'});
            return AuthService.getGGAccessToken(params);
        })
        .then(AuthService.loginGGServer)
        .then(function () {
            $state.go('tab.map').then(function () {});
        }, function (error) {
            if (error != 'canceled')
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

.controller('ProfileCtrl', ['$scope', 'AuthService', '$ionicLoading', '$ionicPopup', '$state', '$q',
function($scope, AuthService, $ionicLoading, $ionicPopup, $state, $q) {
    $scope.user = AuthService.user();
    
    $scope.logout = function() {
        AuthService.logout().then(function() {
            $state.go('login');
        });
    }
}]);
