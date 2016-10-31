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

.controller('MapCtrl', function($scope, $state, Events, Location, $location, $timeout, $ionicLoading, $ionicPopup, $filter) {
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
      position: latLng/*,
      icon: {
        url: 'img/red-circle-128.png',
        size: new google.maps.Size(32, 32),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 0)
      }*/
    });   
    markers.push(marker);

    var content = '<h4>'+ event.roomname+'</h4>'+
        '<p>By '+ $filter('date')(event.endtime, 'EEE, d MMM h:mm a') + '<br/>(' + $filter('timeleft')(event.endtime) +' left)</p>'+
        '<p>'+event.location + '<br/>' + event.distance + ' km away</p>'+
        '<p>'+event.foodtype+'<br/>For ' + event.servings + '</p>'+
        '<p><a href="#/event/'+event.id+'">More details</a></p>';
    var infoWindow = new google.maps.InfoWindow({content: content});
    infoWindows.push(infoWindow);

    if(event){
      marker.addListener('click', function () {
        for(var i=0;i<infoWindows.length;i++){
          infoWindows[i].close();
        }
        infoWindow.addListener('click', function(){
          $timeout(function(){
            $location.path("/event/"+event.id);
          });
        });
        infoWindow.open($scope.map, marker);
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
      icon: {
        url: 'img/blue-circle.png',
        size: new google.maps.Size(32, 32),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 0)
      }
    });
      
    Events.find(targetLatLng.lat(), targetLatLng.lng(), 30000, true).then(
      function(data){
        $ionicLoading.hide();
        events = data.events;
        for(var i=0;i<data.events.length;i++){
          var event = data.events[i];
          var latLng = new google.maps.LatLng(data.events[i].latitude, data.events[i].longitude);
          addEventMarker(latLng, event);
        }
      }
    );
  }
 
  var initMap = function() {
      Location.getCurrentPosition().then(function(latLng){
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

.controller('PostEventCtrl', function($scope, Events, $ionicLoading, Location, $location, $timeout, $filter) {
  $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
    viewData.enableBack = true;
  }); 
    
  // set default end time to be +2 hours
  var endtime = new Date();
  endtime.setTime(endtime.getTime() + (2*60*60*1000));
    
  $scope.event = {
      endtime: $filter('date')(endtime, 'yyyy-MM-dd HH:mm')
  };
  $scope.enddate = $scope.event.endtime.substr(0,10);
  $scope.endtime = $scope.event.endtime.substr(11);
  Location.getCurrentPosition().then(function(latLng){
    var map = new google.maps.Map(document.getElementById("event-post-map"), {
      center: latLng,
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    var marker = new google.maps.Marker({
      map: map,
      position: latLng
    });
    $scope.event.latitude = latLng.lat();
    $scope.event.longitude = latLng.lng();
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
      //TODO
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
    });
    $scope.event.endtime = new Date($scope.event.endtime);
    for(attr in $scope.event){
      if (attr == 'endtime')
            data.append(attr, $scope.event[attr].toISOString());
        else
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
