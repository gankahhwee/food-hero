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
  $ionicLoading.show({template: 'Loading map...'});
  var options = {timeout: 10000, enableHighAccuracy: true},
      markers = [],
      infoWindows = [],
      events, 
      init;
    
  $scope.$on("$ionicView.enter", function(event, data){
    // the map view is cached so we need to load new event if there is any
    if(events){
        var newEvent = Events.newEvent();
        if(newEvent){
            initMapWithLocation(new google.maps.LatLng(newEvent.latitude, newEvent.longitude));
        }
    }
  });
    
  var addEventMarker = function(latLng, event){
    var marker = new google.maps.Marker({
      map: $scope.map,
      animation: google.maps.Animation.DROP,
      position: latLng
    });   
    markers.push(marker);

    var content = '<h4>'+ event.roomname+'</h4>'+
        '<p>'+event.foodtype+'<br/>For ' + event.servings + '</p>'+
        '<p>'+event.location + '<br/>' + event.distance + ' km away</p>'+
        '<p>By '+ $filter('date')(event.endtime, 'EEE, d MMM h:mm a') + '<br/>(' + $filter('timeleft')(event.endtime) +' left)</p>'+
        '<p><a href="#/event/'+event.id+'">More details</a></p>';
    var infoWindow = new google.maps.InfoWindow({content: content});
    infoWindows.push(infoWindow);

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
  
  var createMap = function(center){
    if (typeof($scope.map) != 'undefined' && $scope.map != null)
        return;

    var mapOptions = {
      center: center,
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false
    };

    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

    var GeoMarker = new GeolocationMarker($scope.map);
  };

  var initMapWithLocation = function (location) {
    for(var i=0; i<markers.length; i++){
      markers[i].setMap(null);
    }
    markers.length = 0;
      
    $scope.map.setCenter(location);

    $ionicLoading.show({template: 'Finding food near you...'});
    return Events.find(location.lat(), location.lng(), 30000).then(
      function(data){
        $ionicLoading.hide();
        events = data;
        for(var i=0;i<events.length;i++){
          var event = events[i];
          var latLng = new google.maps.LatLng(events[i].latitude, events[i].longitude);
          addEventMarker(latLng, event);
        }
      }
    );
  };
    
  $scope.refresh = function(){
      initMap(true);
  }
 
  var initMap = function(reload) {
      // create a default Singapore map
      createMap(Location.getDefaultLocation());
      
      $ionicLoading.show({template: 'Locating you...'});
      return Location.getCurrentPosition(reload).then(function(latLng){
        return initMapWithLocation(latLng);

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

.controller('EventCtrl', function($scope, $stateParams, Events, $ionicLoading, $ionicPopup, AuthService) {
    
    $scope.username = AuthService.user().username;
    
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
  
  $scope.foodTypes = [
    {value:'Halal'},
    {value:'Vegetarian'},
    //{value:'Vegetarian-friendly'},
    {value:'Vegan'}
    //,{value:'Vegan-friendly'}
  ];
    
  // set default end time to be +2 hours
  var endtime = new Date();
  endtime.setTime(endtime.getTime() + (2*60*60*1000));
    
  $scope.event = {
      foodtype: '',
      additionalInfo: ''
  };
  
  $scope.enddate = new Date($filter('date')(endtime, 'MM-dd-yyyy') + ' 00:00');
  $scope.endtime = new Date('1-1-1970 ' + $filter('date')(endtime, 'HH:mm'));

  var updateEventEndtime = function(enddate, endtime) {
      if (typeof(enddate) != 'undefined' && typeof(endtime) != 'undefined') 
        $scope.event.endtime = new Date(enddate.toDateString() + ' ' + endtime.toTimeString());
  }
  updateEventEndtime($scope.enddate, $scope.endtime);

  var setEventLatLng = function(latLng){
    $scope.event.latitude = latLng.lat();
    $scope.event.longitude = latLng.lng();
      
    Location.reverseGeocode(latLng, function(results){
      console.log("reverse geocoding results from: " + latLng.lat() + ", " + latLng.lng());
      console.log(results);
      $timeout(function(){
        $scope.event.location = results[0].formatted_address;
      });
    });
  }
  
  var initMap = function(latLng){
    setEventLatLng(latLng);
      
    var map = new google.maps.Map(document.getElementById("event-post-map"), {
      center: latLng,
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
      
    var marker;
    var setMarker = function(markerLatLng){
        if(marker){
            marker.setMap(null);
        }
        marker = new google.maps.Marker({
          map: map,
          draggable:true,
          position: markerLatLng
        });
        marker.addListener('dragend', function(event){setEventLatLng(event.latLng)});
        
        var infoWindow = new google.maps.InfoWindow({
          content: 'You can drag me'
        });
        infoWindow.open(map, marker);
        $timeout(function(){
           infoWindow.close(); 
        }, 4000);
    }
    setMarker(latLng);
      
    $scope.geocode = function(address){
      Location.geocodeAddress(address, function(results){
        console.log("geocoding results from: " + address);
        console.log(results);
        $scope.event.latitude = results[0].geometry.location.lat();
        $scope.event.longitude = results[0].geometry.location.lng();
        map.setCenter(results[0].geometry.location);
        setMarker(results[0].geometry.location);
      });
    };
  }
    
  Location.getCurrentPosition().then(
    initMap, 
    function(message){
      initMap(Location.getDefaultLocation())
    }
  );
  var data = new FormData();
  $scope.getTheFiles = function ($files) {
    angular.forEach($files, function (value, key) {
      data.append("file", value);
    });
  };
  
  $scope.updateEventEndtime = updateEventEndtime;

  $scope.post = function(){
    $ionicLoading.show({
      template: 'Posting...'
    });

    // process food types
    var selected = $filter('filter')($scope.foodTypes,{selected:true});
    var combinedFoodtype = '',
        foodTypes = $scope.foodTypes;
    if(selected.length > 0){
        foodTypes = selected;
    }
    for(var i=0; i<foodTypes.length; i++){
        if(!foodTypes[i].selected){
            combinedFoodtype += 'Not ';
        }
        combinedFoodtype += foodTypes[i].value + ', ';
    }
    if($scope.event.foodtype.trim().length > 0){
        $scope.event.foodtype = combinedFoodtype + $scope.event.foodtype;
    } else {
        $scope.event.foodtype = combinedFoodtype.substr( 0, combinedFoodtype.length-2 );
    }

    for(attr in $scope.event){
      if (attr == 'endtime')
            data.append(attr, $scope.event[attr].toISOString());
        else
            data.append(attr, $scope.event[attr]);
    }
    Events.add(data, $scope.event).then(function(data){
      $ionicLoading.hide();
      if(data.id){
        $location.path("/tab/map");
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
