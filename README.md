# hue-lights
![screenshot](https://github.com/vchlum/hue-lights/blob/main/screenshot.png)

## Gnome Shell extension
hue-lights is a Gnome Shell extension for Philips Hue lights controlled by Philips Hue Bridge on local network. The extension groups the lights in zones and rooms. It is possible to control the state, the brightness, and the color or temperature. The scenes can be activated for the zones or rooms. Multiple bridges are possible to control. It is also possible to set lights that will blink on notification.

## Philips Hue Entertainment areas
This Extension supports the Entertainment areas. Using the original app on the phone, you can create an Entertainment area. You can start synchronizing your lights with your screen afterward. The sync feature requires a special key generated on the bridge pairing. Upgrading from version 8 or earlier requires to remove and connect the Philips Hue bridge. Please keep your bridge up to date. The feature also needs the api version 1.22 or newer. An example of this feature is in this video: https://youtu.be/4WEKdGSNbPY

## Philips Hue HDMI sync box support
This extension allows controlling Philips Hue HDMI sync box on local network. You can enable/disable synchronization, change the mode, change the intensity, adjust the brightness, select the entertainment area, and select the HDMI input.

## Troubleshooting
 1. If you are experiencing any trouble with the upgrade, try to log out and log in again.
 1. If your troubles persist, reset this extension by reseting key: "/org/gnome/shell/extensions/hue-lights/" in gnome.
    * You can call: `dconf reset -f /org/gnome/shell/extensions/hue-lights/` or use `dconf-editor`.
 1. Not vanishing your trouble, please file an issue on GitHub. If you can, please enable debug mode in the settings and attach the log file.
    * You can obtain the logfile like this: `journalctl -f /usr/bin/gnome-shell 2>&1 | grep -i hue > hue-lights.log`.

## Warning
This application makes use of fast changing light effects conditions alone, or in combination with certain content on the screen it may trigger previously undetected epileptic symptoms or seizures in persons who have no history of prior seizures or epilepsy.

## Supported Gnome Shell version
This extension supports Gnome Shell verison 3.36 and above.

## Installation from e.g.o
https://extensions.gnome.org/extension/3737/hue-lights

## Manual installation

 1. `git clone https://github.com/vchlum/hue-lights.git`
 1. `cd hue-lights`
 1. `./release.sh`
 1. `gnome-extensions install hue-lights@chlumskyvaclav.gmail.com.zip`
 1. Log out & Log in
 1. `gnome-extensions enable hue-lights@chlumskyvaclav.gmail.com`
