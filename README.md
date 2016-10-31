# Food Hero Ionic App

## Getting Started With Development

### Tools

You will need the following tools:

* [bower](https://bower.io/)
* [ionic](http://ionicframework.com/)
* [Android Studio](https://developer.android.com/studio/)

### Build Steps

1. Download this repo from github
1. Run `bower install` to install all JavaScript dependencies
1. Run `ionic state restore` to restore all cordova plugins and platforms
1. You might need to copy all the folders inside `res/` into `platforms/android/res` - this might be due to a bug in ionic.
1. Open up Android Studio and import the folder `platforms/android` as a new project

  If Android Studio prompts to upgrade Graddle, **DO NOT** upgrade or else it will affect the build
  
1. Connect your phone to the laptop on USB, click the Run button in Android Studio and select the phone. The app should be compiled and loaded into the phone.

### Updates

* If you update the source code, run `ionic update platform android` to update the code, then click Run in Android Studio to build and load the app to the phone.

### To generate new icons / splash screens

1. Put icon.png and splash.png into folder `resources`
1. Run `ionic resources`. The resources file will be generated under the folder `resources/android`
1. Run `ionic update platform android` to update the code
1. You might need to copy all the folders inside `res/` into `platforms/android/res` - this might be due to a bug in ionic.
