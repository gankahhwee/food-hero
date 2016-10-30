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
  
    var latLng = new google.maps.LatLng(position.lat, position.lng);

    var mapOptions = {
      center: latLng,
      zoom: position.zoom,
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
      
    Events.find(position.lat, position.lng, 30000, position.sucess).then(
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

.controller('PostEventCtrl', function($scope, Events, $cordovaDatePicker) {
  var options = {
    date: new Date(),
    mode: 'date', // or 'time'
    minDate: new Date(),
    allowOldDates: true,
    allowFutureDates: false,
    doneButtonLabel: 'DONE',
    doneButtonColor: '#F2F3F4',
    cancelButtonLabel: 'CANCEL',
    cancelButtonColor: '#000000'
  };

  $scope.changeEndtime = function(){
    $cordovaDatePicker.show(options).then(function(date){
        alert(date);
    });
  };
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
  
  $scope.login = function(username, password){
      $ionicLoading.show({
        template: 'Loading...'
      })
      AuthService.login(username, password).then(function(result){
          $ionicLoading.hide();
          if(result.success){
              $state.go('tab.map').then(function(){
                
              });
          } else {
              $ionicPopup.alert({
                 title: 'Login unsuccessful',
                 template: result.error
              });
          }
      });
  }
});
