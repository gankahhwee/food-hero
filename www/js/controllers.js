angular.module('starter.controllers', [])

.controller('MainCtrl', function($rootScope, $state, $location, AuthService) {
    var authCheck = function(){
      if(!$state.disableAuthCheck){
        if(!AuthService.user()){
          //$state.go('login');
          $location.path('/login');
        }
      }
    }
    $rootScope.$on("$locationChangeSuccess", authCheck);
    authCheck();
})

.controller('MapCtrl', function($scope, $state, $cordovaGeolocation, Events) {
  var options = {timeout: 10000, enableHighAccuracy: true},
      markers = [], 
      events, 
      init;
    
  var addMarker = function(latLng){
      var marker = new google.maps.Marker({
        map: $scope.map,
        animation: google.maps.Animation.DROP,
        position: latLng
      });   
      markers.push(marker);

      var infoWindow = new google.maps.InfoWindow({
        content: '<img class="full-image" src="img/adam.jpg"><h4>Climate Seminar</h4><p>12 Nov 2014, 10.39am</p><p>420 Canberra Road, Singapore 750420</p><p><a href="#">Read more</a></p>'
      });

      marker.addListener('click', function () {
        infoWindow.open($scope.map, marker);
      });
  }
 
  $cordovaGeolocation.getCurrentPosition(options).then(function(position){
  
    var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    var mapOptions = {
      center: latLng,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

    var initMarkers = function(){
      if(markers.length > 0) return;
      addMarker(latLng);
    }

    var loadedListener = $scope.map.addListener('idle',function(){
      initMarkers();
    });
      
    Events.find(position.coords.latitude, position.coords.longitude, 30000).then(
      function(data){
        events = data.events;
        for(var i=0;i<data.events.length;i++){
          var latLng = new google.maps.LatLng(data.events[i].latitude, data.events[i].longitude);
          addMarker(latLng);
        }
      }
    );
 
  }, function(error){
    console.log("Could not get location");
  });
})

.controller('EventCtrl', function($scope, $stateParams, Events) {
    $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
      viewData.enableBack = true;
    }); 
    $scope.event = Events.get($stateParams.id);
})

.controller('EventsCtrl', function($scope, Events) {
  $scope.events = Events.all();
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
