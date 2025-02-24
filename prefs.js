'use strict';

/**
 * prefs hue-lights
 * JavaScript Gnome extension for Philips Hue lights and bridges.
 *
 * @author Václav Chlumský
 * @copyright Copyright 2022, Václav Chlumský.
 */

 /**
 * @license
 * The MIT License (MIT)
 *
 * Copyright (c) 2022 Václav Chlumský
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Hue = Me.imports.phue;
const HueSB = Me.imports.phuesyncbox;
const NM = imports.gi.NM;

const Gettext = imports.gettext.domain('hue-lights');
var _ = Gettext.gettext;
var forceEnglish = false;

var hue;
var hueSB;

/**
 * HuePrefs class for creating preference window
 *
 * @class HuePrefs
 * @constructor
 * @param {object} instance of Phue class with bridges
 * @return {Object} instance
 */
var Prefs = class HuePrefs {

    constructor(hue, hueSB) {

        forceEnglish = ExtensionUtils.getSettings(
            Utils.HUELIGHTS_SETTINGS_SCHEMA
        ).get_boolean(Utils.HUELIGHTS_SETTINGS_FORCE_ENGLISH);
        _ = forceEnglish ? (a) => { return a; } : Gettext.gettext;

        this._refreshPrefs = false;
        this._defaultPage = 0;
        this._hue = hue;
        this._hueSB = hueSB;
        this._dialogSynBoxPress = null;
        this._prefsWidget = new Gtk.ScrolledWindow(
            {
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                hexpand: true,
                vexpand: true,
                vexpand_set:true,
                hexpand_set: true,
                halign:Gtk.Align.FILL,
                valign:Gtk.Align.FILL
            }
        );

        this._settings = ExtensionUtils.getSettings(Utils.HUELIGHTS_SETTINGS_SCHEMA);
        this._settings.connect("changed", () => {
            if (this._refreshPrefs) {
                this.getPrefsWidget();
                this._refreshPrefs = false;
            }
        });

        this.readSettings();

        this._hueSB.connect(
            "registration-complete",
            () => {
                if (this._dialogSynBoxPress !== null) {
                    this._dialogSynBoxPress.destroy();
                    this._dialogSynBoxPress = null;
                }

                this._hueSB.checkSyncBoxes();
                this._refreshPrefs = true;
                this._defaultPage = 3;
                this.writeSettings();
            }
        );

        this._hueSB.connect(
            "registration-failed",
            () => {
                if (this._dialogSynBoxPress !== null) {
                    this._dialogSynBoxPress.destroy();
                    this._dialogSynBoxPress = null;
                }

                this._hueSB.checkSyncBoxes();
                this._refreshPrefs = true;
                this._defaultPage = 3;
                this.writeSettings();
            }
        );

        this._hue.checkBridges();
        this._hueSB.checkSyncBoxes();

        this.writeSettings();
    }

    /**
     * Reads settings into class variables.
     *
     * @method readSettings
     */
    readSettings() {

        this._hue.bridges = this._settings.get_value(Utils.HUELIGHTS_SETTINGS_BRIDGES).deep_unpack();
        this._indicatorPosition = this._settings.get_enum(Utils.HUELIGHTS_SETTINGS_INDICATOR);
        this._zonesFirst = this._settings.get_boolean(Utils.HUELIGHTS_SETTINGS_ZONESFIRST);
        this._showScenes = this._settings.get_boolean(Utils.HUELIGHTS_SETTINGS_SHOWSCENES);
        this._compactMenu = this._settings.get_boolean(Utils.HUELIGHTS_SETTINGS_COMPACTMENU);
        this._connectionTimeout = this._settings.get_int(Utils.HUELIGHTS_SETTINGS_CONNECTION_TIMEOUT);
        Utils.debug = this._settings.get_boolean(Utils.HUELIGHTS_SETTINGS_DEBUG);
        this._notifyLights = this._settings.get_value(Utils.HUELIGHTS_SETTINGS_NOTIFY_LIGHTS).deep_unpack();
        this._iconPack = this._settings.get_enum(Utils.HUELIGHTS_SETTINGS_ICONPACK);
        this._entertainment = this._settings.get_value(Utils.HUELIGHTS_SETTINGS_ENTERTAINMENT).deep_unpack();
        this._hueSB.syncboxes = this._settings.get_value(Utils.HUELIGHTS_SETTINGS_SYNCBOXES).deep_unpack();
        this._connectionTimeoutSB = this._settings.get_int(Utils.HUELIGHTS_SETTINGS_CONNECTION_TIMEOUT_SB);
        this._associatedConnection = this._settings.get_value(Utils.HUELIGHTS_SETTINGS_ASSOCIATED_CONNECTION).deep_unpack();
    }

    /**
     * Write settings from class variables.
     *
     * @method writeSettings
     */
    writeSettings() {

        this._settings.set_value(
            Utils.HUELIGHTS_SETTINGS_BRIDGES,
            new GLib.Variant(
                Utils.HUELIGHTS_SETTINGS_BRIDGES_TYPE,
                this._hue.bridges
            )
        );

        this._settings.set_value(
            Utils.HUELIGHTS_SETTINGS_SYNCBOXES,
            new GLib.Variant(
                Utils.HUELIGHTS_SETTINGS_SYNCBOXES_TYPE,
                this._hueSB.syncboxes
            )
        );
    }

    /**
     * Wite setting for lights used for notification
     *
     * @method writeNotifyLightsSettings
     */
    writeNotifyLightsSettings() {

        this._settings.set_value(
            Utils.HUELIGHTS_SETTINGS_NOTIFY_LIGHTS,
            new GLib.Variant(
                Utils.HUELIGHTS_SETTINGS_NOTIFY_LIGHTS_TYPE,
                this._notifyLights
            )
        );
    }

    /**
     * Wite setting for entertainment area
     *
     * @method writeEntertainmentSettings
     */
    writeEntertainmentSettings() {

        this._settings.set_value(
            Utils.HUELIGHTS_SETTINGS_ENTERTAINMENT,
            new GLib.Variant(
                Utils.HUELIGHTS_SETTINGS_ENTERTAINMENT_TYPE,
                this._entertainment
            )
        );
    }

    /**
     * Wite setting for associated connections
     *
     * @method writeAssociatedConnections
     */
    writeAssociatedConnections() {
        this._settings.set_value(
            Utils.HUELIGHTS_SETTINGS_ASSOCIATED_CONNECTION,
            new GLib.Variant(
                Utils.HUELIGHTS_SETTINGS_ASSOCIATED_CONNECTION_TYPE,
                this._associatedConnection
            )
        );
    }

    /**
     * Get the main witget for prefs.
     *
     * @method getPrefsWidget
     * @return {Object} the widget itself
     */
    getPrefsWidget() {

        if (Utils.isGnome40()) {
            this._prefsWidget.set_child(this._buildWidget());

            return this._prefsWidget;
        }

        /* else Gnome 3.x */

        let children = this._prefsWidget.get_children();
        for (let child in children) {
            children[child].destroy();
        }

        this._prefsWidget.add(this._buildWidget());
        this._prefsWidget.show_all();

        return this._prefsWidget;
    }

    /**
     * Create the main notebook with its content.
     *
     * @method _buildWidget
     * @private
     * @return {Object} the notebook widget
     */
    _buildWidget() {

        let notebook = new Gtk.Notebook();

        let pageBridges = this._buildBridgesWidget();
        pageBridges.border_width = 10;
        notebook.append_page(
            pageBridges,
            new Gtk.Label({label: _("Philips Hue bridges")})
        );

        let pageGeneral = this._buildGeneralWidget();
        pageGeneral.border_width = 10;
        notebook.append_page(
            pageGeneral,
            new Gtk.Label({label: _("General settings")})
        );

        let pageEntertainment = this._buildEntertainmentWidget();
        pageEntertainment.border_width = 10;
        notebook.append_page(
            pageEntertainment,
            new Gtk.Label({label: _("Entertainment areas")})
        );

        let pageSyncBox = this._buildSyncBoxesWidget();
        pageSyncBox.border_width = 10;
        notebook.append_page(
            pageSyncBox,
            new Gtk.Label({label: _("Philips Hue HDMI sync boxes")})
        );

        let pageAdvanced = this._buildAdvancedWidget();
        pageAdvanced.border_width = 10;
        notebook.append_page(
            pageAdvanced,
            new Gtk.Label({label: _("Advanced settings")})
        );

        let aboutIcon;
        if (Utils.isGnome40()) {
            aboutIcon = Gtk.Image.new_from_icon_name("help-about");
        } else {
            aboutIcon = Gtk.Image.new_from_icon_name("help-about", Gtk.IconSize.MENU);
        }

        let pageAbout = this._buildAboutWidget()
        pageAbout.border_width = 10;
        notebook.append_page(
            pageAbout,
            aboutIcon
        );

        notebook.set_current_page(this._defaultPage);

        return notebook;
    }

    /**
     * Create the widget with listed bridges.
     *
     * @method _buildBridgesWidget
     * @private
     * @return {Object} the widget with bridges
     */
    _buildBridgesWidget() {

        let top = 1;
        let tmpWidged = null;
        let nameWidget = null;
        let ipWidget = null;
        let statusWidget = null;
        let connectWidget = null;
        let removeWidget = null;
        let discoveryWidget = null;
        let addWidget = null;

        let bridgesWidget = new Gtk.Grid(
            {
                hexpand: true,
                vexpand: true,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );

        for (let bridge in this._hue.bridges) {
            let name = _("unknown name");

            if (this._hue.bridges[bridge]["name"] !== undefined) {
                name = this._hue.bridges[bridge]["name"];
            }

            nameWidget = new Gtk.Label({label: name});
            bridgesWidget.attach(nameWidget, 1, top, 1, 1);

            ipWidget = new Gtk.Entry();
            ipWidget.set_text(this._hue.bridges[bridge]["ip"]);
            bridgesWidget.attach_next_to(
                ipWidget,
                nameWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            if (this._hue.instances[bridge].isConnected()) {
                statusWidget = new Gtk.Label({label: _("Connected")});
                bridgesWidget.attach_next_to(
                    statusWidget,
                    ipWidget,
                    Gtk.PositionType.RIGHT,
                    1,
                    1
                );
                tmpWidged = statusWidget;
            } else if (this._hue.bridges[bridge]["username"] !== undefined) {
                statusWidget = new Gtk.Label({label: _("Unreachable")});
                bridgesWidget.attach_next_to(
                    statusWidget,
                    ipWidget,
                    Gtk.PositionType.RIGHT,
                    1,
                    1
                );
                tmpWidged = statusWidget;
            } else {
                connectWidget = new Gtk.Button({label: _("Connect")});
                connectWidget.connect(
                    "clicked",
                    this._widgetEventHandler.bind(
                        this,
                        {"event": "connect-bridge", "bridgeid":bridge, "object":ipWidget}
                    )
                );
                bridgesWidget.attach_next_to(
                    connectWidget,
                    ipWidget,
                    Gtk.PositionType.RIGHT,
                    1,
                    1
                );
                tmpWidged = connectWidget;
            }
            removeWidget = new Gtk.Button({label: _("Remove")});
            removeWidget.connect(
                "clicked",
                this._widgetEventHandler.bind(
                    this,
                    {"event": "remove-bridge", "bridgeid": bridge}
                )
            );
            bridgesWidget.attach_next_to(
                removeWidget,
                tmpWidged,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            if (this._hue.bridges[bridge]["default"] !== undefined &&
                this._hue.bridges[bridge]["default"] === bridge) {

                let unDefaultWidget = new Gtk.Button({label: _("Disprefer")});
                unDefaultWidget.connect(
                    "clicked",
                    this._widgetEventHandler.bind(
                        this,
                        {"event": "unset-default-bridge", "bridgeid": bridge}
                    )
                );
                tmpWidged = unDefaultWidget;
            } else {
                let defaultWidget = new Gtk.Button({label: _("Prefer")});
                defaultWidget.connect(
                    "clicked",
                    this._widgetEventHandler.bind(
                        this,
                        {"event": "set-default-bridge", "bridgeid": bridge}
                    )
                );
                tmpWidged = defaultWidget;
            }
            bridgesWidget.attach_next_to(
                tmpWidged,
                removeWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            let connectionsWidget = this._getConnectionWidget(bridge, "bridge");
            bridgesWidget.attach_next_to(
                connectionsWidget,
                tmpWidged,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            top++;
        }

        addWidget = new Gtk.Button(
            {label: _("Add Philips Hue bridge IP")}
        );
        addWidget.connect(
            "clicked",
            this._widgetEventHandler.bind(
                this,
                {"event": "add-ip", "object": ipWidget}
            )
        );
        bridgesWidget.attach(addWidget, 1, top, 6, 1);

        top++;

        discoveryWidget = new Gtk.Button(
            {label: _("Discover Philips Hue bridges")}
        );
        discoveryWidget.connect(
            "clicked",
            this._widgetEventHandler.bind(
                this,
                {"event": "discovery-bridges"}
            )
        );
        bridgesWidget.attach(discoveryWidget, 1, top, 6, 1);

        top++;

        return bridgesWidget;
    }

    /**
     * Create the widget with general settings.
     *
     * @method _buildGeneralWidget
     * @private
     * @return {Object} the widget with settings
     */
    _buildGeneralWidget() {

        let top = 1;
        let labelWidget = null;

        let generalWidget = new Gtk.Grid(
            {
                hexpand: true,
                vexpand: true,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );

        /**
         * Position in panel
         */
        labelWidget = new Gtk.Label(
            {label: _("Position of the menu icon in panel:")}
        );
        generalWidget.attach(labelWidget, 1, top, 1, 1);

        let positinInPanelWidget = new Gtk.ComboBoxText();
        positinInPanelWidget.append_text(_("center"));
        positinInPanelWidget.append_text(_("right"));
        positinInPanelWidget.append_text(_("left"));
        positinInPanelWidget.set_active(this._indicatorPosition);
        positinInPanelWidget.connect(
            "changed",
            this._widgetEventHandler.bind(
                this,
                {"event": "position-in-panel", "object": positinInPanelWidget}
            )
        )
        generalWidget.attach_next_to(
            positinInPanelWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        /**
         * Icon pack
         */
        labelWidget = new Gtk.Label(
            {label: _("Icon pack:")}
        );
        generalWidget.attach(labelWidget, 1, top, 1, 1);

        let iconPackWidget = new Gtk.ComboBoxText();
        iconPackWidget.append_text(_("none"));
        iconPackWidget.append_text(_("bright"));
        iconPackWidget.append_text(_("dark"));
        iconPackWidget.set_active(this._iconPack);
        iconPackWidget.connect(
            "changed",
            this._widgetEventHandler.bind(
                this,
                {"event": "icon-pack", "object": iconPackWidget}
            )
        )
        generalWidget.attach_next_to(
            iconPackWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        /**
         * Show zones first
         */
        labelWidget = new Gtk.Label(
            {label: _("Show zones first:")}
        );
        generalWidget.attach(labelWidget, 1, top, 1, 1);

        let zonesFirstWidget = new Gtk.Switch(
            {
                active: this._zonesFirst,
                hexpand: false,
                vexpand: false,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );
        zonesFirstWidget.connect(
            "notify::active",
            this._widgetEventHandler.bind(
                this,
                {"event": "zones-first", "object": zonesFirstWidget}
            )
        )
        generalWidget.attach_next_to(
            zonesFirstWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        /**
         * Show zones in group menu
         */
        labelWidget = new Gtk.Label(
            {label: _("Show scenes:")}
        );
        generalWidget.attach(labelWidget, 1, top, 1, 1);

        let showScenesWidget = new Gtk.Switch(
            {
                active: this._showScenes,
                hexpand: false,
                vexpand: false,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );
        showScenesWidget.connect(
            "notify::active",
            this._widgetEventHandler.bind(
                this,
                {"event": "show-scenes", "object": showScenesWidget}
            )
        )
        generalWidget.attach_next_to(
            showScenesWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;
        if (Utils.isGnome40()) {
            generalWidget.attach(new Gtk.Separator(Gtk.HORIZONTAL), 1, top, 2, 1);
        } else {
            generalWidget.attach(new Gtk.HSeparator(), 1, top, 2, 1);
        }
        top++;

        /**
         * compact menu
         */

        labelWidget = new Gtk.Label(
            {label: _("Compact menu settings")}
        );
        generalWidget.attach(labelWidget, 1, top, 2, 1);

        top++;

        /**
         * Use compact menu
         */
         labelWidget = new Gtk.Label(
            {label: _("Default use:")}
        );
        generalWidget.attach(labelWidget, 1, top, 1, 1);

        let compactMenuWidget = new Gtk.Switch(
            {
                active: this._compactMenu,
                hexpand: false,
                vexpand: false,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );
        compactMenuWidget.connect(
            "notify::active",
            this._widgetEventHandler.bind(
                this,
                {"event": "compact-menu", "object": compactMenuWidget}
            )
        )
        generalWidget.attach_next_to(
            compactMenuWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        if (Utils.isGnome40()) {
            generalWidget.attach(new Gtk.Separator(Gtk.HORIZONTAL), 1, top, 2, 1);
        } else {
            generalWidget.attach(new Gtk.HSeparator(), 1, top, 2, 1);
        }
        top++;

        /**
         * Blink light notification
         */
        let notifyLightId = undefined;

        labelWidget = new Gtk.Label(
            {label: _("Notification lights:")}
        );
        generalWidget.attach(labelWidget, 1, top, 1, 1);

        /* list all lights in menu wich checkboxes/switches */
        let lightNotifyMenuBUtton = new Gtk.MenuButton({label: _("Select lights")});

        let lightNotifyMenu;
        let notifyLightsListBox; /* used for Gnome 40*/
        let notifyScrolledWindow; /* used for Gnome 40*/
        if (Utils.isGnome40()) {
            lightNotifyMenu = new Gtk.Popover();
            lightNotifyMenuBUtton.set_popover(lightNotifyMenu);
            notifyScrolledWindow = new Gtk.ScrolledWindow();
            notifyScrolledWindow.min_content_width = 300;
            notifyScrolledWindow.min_content_height = 200;
            notifyLightsListBox = new Gtk.Box(
                {
                    orientation: Gtk.Orientation.VERTICAL
                }
            );
            notifyScrolledWindow.set_child(notifyLightsListBox);
        } else {
            lightNotifyMenu = new Gtk.Menu();
            lightNotifyMenuBUtton.set_popup(lightNotifyMenu);
        }

        for (let bridgeid in this._hue.instances) {

            if (this._hue.data[bridgeid] === undefined ||
                this._hue.data[bridgeid]["groups"] === undefined) {
                continue;
            }

            for (let groupid in this._hue.data[bridgeid]["groups"]) {

                if (this._hue.data[bridgeid]["groups"][groupid]["type"] !== "Room") {
                    continue;
                }

                for (let l in this._hue.data[bridgeid]["groups"][groupid]["lights"]) {
                    let lightid = parseInt(this._hue.data[bridgeid]["groups"][groupid]["lights"][l]);

                    notifyLightId = `${bridgeid}::${lightid}`;

                    let lightName = this._hue.data[bridgeid]["lights"][lightid]["name"];
                    let groupName = this._hue.data[bridgeid]["groups"][groupid]["name"];

                    if (Utils.isGnome40()) {
                        let notifyLightBox = new Gtk.Box(
                            {
                                orientation: Gtk.Orientation.HORIZONTAL
                            }
                        );
                        notifyLightBox.append(new Gtk.Label(
                            {
                                label: `${groupName} - ${lightName}`,
                                hexpand: true,
                                halign:Gtk.Align.START,
                            }
                        ));

                        notifyLightsListBox.append(notifyLightBox);
                        let isActive = false;
                        if (this._notifyLights[notifyLightId] !== undefined) {
                            isActive = true;
                        }
                        let switchNotifyLight = new Gtk.Switch(
                            {
                                active: isActive
                            }
                        );
                        switchNotifyLight.connect(
                            "notify::active",
                            this._widgetEventHandler.bind(
                                this,
                                {
                                    "event": "notify-light-toggled",
                                    "notify-lightid": notifyLightId,
                                    "object": switchNotifyLight
                                }
                            )
                        )
                        notifyLightBox.append(switchNotifyLight);

                    } else {
                        /* Gnome 3.x */

                        let lightNotifyMenuItem = new Gtk.CheckMenuItem({label:`${groupName} - ${lightName}`});
                        for (let i in this._notifyLights) {
                            if (notifyLightId == i) {
                                lightNotifyMenuItem.active = true;
                            }
                        }
                        lightNotifyMenuItem.connect(
                            "toggled",
                            this._widgetEventHandler.bind(
                                this,
                                {
                                    "event": "notify-light-toggled",
                                    "notify-lightid": notifyLightId,
                                    "object": lightNotifyMenuItem
                                }
                            )
                        )
                        lightNotifyMenu.append(lightNotifyMenuItem);
                    }
                }

            }

        }

        if (Utils.isGnome40()) {
            lightNotifyMenu.set_child(notifyScrolledWindow);
        } else {
            lightNotifyMenu.show_all();
        }

        generalWidget.attach_next_to(
            lightNotifyMenuBUtton,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        /* find some valid notifyLightId - if possible */
        for (let i in this._notifyLights) {
            notifyLightId = i;
            break;
        }

        /**
         * Brightness for notification light
         */
        let briVal = 255;
        if (notifyLightId !== undefined &&
            this._notifyLights[notifyLightId] !== undefined &&
            this._notifyLights[notifyLightId]["bri"] !== undefined) {

            briVal = this._notifyLights[notifyLightId]["bri"];
        }

        let adj = new Gtk.Adjustment({
            value : 1.0,
            lower: 0,
            upper: 255,
            step_increment : 1,
            page_increment : 20,
            page_size : 0
        });
        let brightnessNotifyWidget = new Gtk.ScaleButton({
            icons: ["display-brightness-symbolic"],
            adjustment : adj
        });
        brightnessNotifyWidget.value = briVal;
        brightnessNotifyWidget.connect(
            "value-changed",
            this._widgetEventHandler.bind(
                this,
                {
                    "event": "notify-light-brightness",
                    "object": brightnessNotifyWidget
                }
            )
        )
        generalWidget.attach(brightnessNotifyWidget, 1, top, 1, 1);

        /**
         * Color for notification light
         */
        let colorButtonNotifyWidget = new Gtk.ColorButton();
        let notifyLightColor = new Gdk.RGBA();

        notifyLightColor.red = 1.0;
        notifyLightColor.green = 1.0;
        notifyLightColor.blue = 1.0;
        if (notifyLightId !== undefined &&
            this._notifyLights[notifyLightId] !== undefined &&
            this._notifyLights[notifyLightId]["r"] !== undefined) {

            notifyLightColor.red = this._notifyLights[notifyLightId]["r"] / 255;
            notifyLightColor.green = this._notifyLights[notifyLightId]["g"] / 255;
            notifyLightColor.blue = this._notifyLights[notifyLightId]["b"] / 255;
        }
        notifyLightColor.alpha = 1.0;
        colorButtonNotifyWidget.set_rgba(notifyLightColor);
        colorButtonNotifyWidget.connect(
            "color-set",
            this._widgetEventHandler.bind(
                this,
                {
                    "event": "notify-light-color",
                    "object": colorButtonNotifyWidget
                }
            )
        )

        generalWidget.attach_next_to(
            colorButtonNotifyWidget,
            brightnessNotifyWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;
        if (Utils.isGnome40()) {
            generalWidget.attach(new Gtk.Separator(Gtk.HORIZONTAL), 1, top, 2, 1);
        } else {
            generalWidget.attach(new Gtk.HSeparator(), 1, top, 2, 1);
        }

        top++;

        /**
         * Force English language
         */
        labelWidget = new Gtk.Label(
            {label: _("Force English language (requires relogin):")}
        );
        generalWidget.attach(labelWidget, 1, top, 1, 1);

        let forceEnglishWidget = new Gtk.Switch(
            {
                active: forceEnglish,
                hexpand: false,
                vexpand: false,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );
        forceEnglishWidget.connect(
            "notify::active",
            this._widgetEventHandler.bind(
                this,
                {"event": "force-english", "object": forceEnglishWidget}
            )
        )
        generalWidget.attach_next_to(
            forceEnglishWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        return generalWidget;
    }

    /**
     * Create the widget with listed entertainment areas.
     *
     * @method _buildEntertainmentWidget
     * @private
     * @return {Object} the widget with Entertainment areas
     */
    _buildEntertainmentWidget() {

        let top = 1;
        let labelWidget = null;

        let entertainmentWidget = new Gtk.Grid(
            {
                hexpand: true,
                vexpand: true,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );

        for (let bridgeid in this._hue.instances) {

            let adj;

            if (this._hue.data[bridgeid] === undefined ||
                this._hue.data[bridgeid]["groups"] === undefined) {
                continue;
            }

            /**
             * Bridge name
             */
             labelWidget = new Gtk.Label({
                label: this._hue.bridges[bridgeid]["name"]
            });
            entertainmentWidget.attach(labelWidget, 1, top, 2, 1);

            top++;

            /**
             * autostart entertainment area
             */
            labelWidget = new Gtk.Label({
                label: _("Autostart on GNOME login:")
            });
            entertainmentWidget.attach(labelWidget, 1, top, 1, 1);

            let entertainmentGroupsWidget = new Gtk.ComboBoxText();

            entertainmentGroupsWidget.append("-1", _("none"));

            for (let groupid in this._hue.data[bridgeid]["groups"]) {
                if (this._hue.data[bridgeid]["groups"][groupid]["type"] !== "Entertainment") {
                    continue;
                }

                entertainmentGroupsWidget.append(
                    groupid,
                    this._hue.data[bridgeid]["groups"][groupid]["name"]
                );
            }

            entertainmentGroupsWidget.set_active_id("-1");
            if (this._entertainment[bridgeid] !== undefined) {
                if (this._entertainment[bridgeid]["autostart"] !== undefined) {

                    entertainmentGroupsWidget.set_active_id(
                        this._entertainment[bridgeid]["autostart"].toString()
                    );
                }
            }

            entertainmentGroupsWidget.connect(
                "changed",
                this._widgetEventHandler.bind(
                    this, {
                        "event": "entertainment-autostart",
                        "object": entertainmentGroupsWidget,
                        "bridgeid": bridgeid
                    }
                )
            )

            entertainmentWidget.attach_next_to(
                entertainmentGroupsWidget,
                labelWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            top++;

            /**
             * default entertainment mode
             */
            labelWidget = new Gtk.Label({
            label: _("Default entertainment mode:")
            });
            entertainmentWidget.attach(labelWidget, 1, top, 1, 1);

            let entertainmentModesWidget = new Gtk.ComboBoxText();

            for (let mode in Utils.entertainmentModeText) {
                entertainmentModesWidget.append(
                    mode.toString(),
                    _(Utils.entertainmentModeText[mode])
                );
            }

            entertainmentModesWidget.set_active_id(Utils.entertainmentMode.SYNC.toString());
            if (this._entertainment[bridgeid] !== undefined) {
                if (this._entertainment[bridgeid]["mode"] !== undefined) {

                    entertainmentModesWidget.set_active_id(
                        this._entertainment[bridgeid]["mode"].toString()
                    );
                }
            }

            entertainmentModesWidget.connect(
                "changed",
                this._widgetEventHandler.bind(
                    this, {
                        "event": "entertainment-mode",
                        "object": entertainmentModesWidget,
                        "bridgeid": bridgeid
                    }
                )
            )

            entertainmentWidget.attach_next_to(
                entertainmentModesWidget,
                labelWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            top++;

            /**
             * default entertainment intensity
             */
            labelWidget = new Gtk.Label({
                label: _("Default intensity:")
            });
            entertainmentWidget.attach(labelWidget, 1, top, 1, 1);

            adj = new Gtk.Adjustment({
                value : 1.0,
                lower: 0,
                upper: 255,
                step_increment : 1,
                page_increment : 20,
                page_size : 0
            });
            let intensityEntertainmentWidget = new Gtk.ScaleButton({
                icons: ["keyboard-brightness-symbolic"],
                adjustment : adj
            });

            intensityEntertainmentWidget.value = 150
            if (this._entertainment[bridgeid] !== undefined) {
                if (this._entertainment[bridgeid]["intensity"] !== undefined) {
                    intensityEntertainmentWidget.value = 255 - this._entertainment[bridgeid]["intensity"] + 40;
                }

            }

            intensityEntertainmentWidget.connect(
                "value-changed",
                this._widgetEventHandler.bind(
                    this, {
                        "event": "entertainment-intensity",
                        "object": intensityEntertainmentWidget,
                        "bridgeid": bridgeid
                    }
                )
            )
            entertainmentWidget.attach_next_to(
                intensityEntertainmentWidget,
                labelWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            top++;

            /**
             * default entertainment brightness
             */
            labelWidget = new Gtk.Label(
                {label: _("Default brightness:")}
            );
            entertainmentWidget.attach(labelWidget, 1, top, 1, 1);

            adj = new Gtk.Adjustment({
                value : 1.0,
                lower: 0,
                upper: 255,
                step_increment : 1,
                page_increment : 20,
                page_size : 0
            });
            let brightnessEntertainmentWidget = new Gtk.ScaleButton({
                icons: ["display-brightness-symbolic"],
                adjustment : adj
            });

            brightnessEntertainmentWidget.value = 255;
            if (this._entertainment[bridgeid] !== undefined) {
                if (this._entertainment[bridgeid]["bri"] !== undefined) {
                    brightnessEntertainmentWidget.value = this._entertainment[bridgeid]["bri"];
                }
            }

            brightnessEntertainmentWidget.connect(
                "value-changed",
                this._widgetEventHandler.bind(
                    this, {
                        "event": "entertainment-brightness",
                        "object": brightnessEntertainmentWidget,
                        "bridgeid": bridgeid
                    }
                )
            )
            entertainmentWidget.attach_next_to(
                brightnessEntertainmentWidget,
                labelWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            top++;
        }

        if (top === 1) {
            labelWidget = new Gtk.Label(
                {label: _("Nothing here yet. Connect your bridge.")}
            );
            entertainmentWidget.attach(labelWidget, 1, top, 1, 1);
        }

        return entertainmentWidget;
    }

    /**
     * Create the widget with HDMI sync boxes settings.
     *
     * @method _buildSyncBoxesWidget
     * @private
     * @return {Object} the widget with advancedsettings
     */
    _buildSyncBoxesWidget() {

        let top = 1;
        let tmpWidged = null;
        let nameWidget = null;
        let ipWidget = null;
        let statusWidget = null;
        let connectWidget = null;
        let removeWidget = null;
        let addWidget = null;

        let syncBoxesWidget = new Gtk.Grid(
            {
                hexpand: true,
                vexpand: true,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );

        for (let sb in this._hueSB.syncboxes) {
            let name = _("unknown name");

            if (this._hueSB.syncboxes[sb]["name"] !== undefined) {
                name = this._hueSB.syncboxes[sb]["name"];
            }

            nameWidget = new Gtk.Label({label: name});
            syncBoxesWidget.attach(nameWidget, 1, top, 1, 1);

            ipWidget = new Gtk.Entry();
            ipWidget.set_text(this._hueSB.syncboxes[sb]["ip"]);
            syncBoxesWidget.attach_next_to(
                ipWidget,
                nameWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            if (this._hueSB.instances[sb].isConnected()) {
                statusWidget = new Gtk.Label({label: _("Connected")});
                syncBoxesWidget.attach_next_to(
                    statusWidget,
                    ipWidget,
                    Gtk.PositionType.RIGHT,
                    1,
                    1
                );
                tmpWidged = statusWidget;
            } else if (this._hueSB.syncboxes[sb]["accessToken"] !== undefined) {
                statusWidget = new Gtk.Label({label: _("Unreachable")});
                syncBoxesWidget.attach_next_to(
                    statusWidget,
                    ipWidget,
                    Gtk.PositionType.RIGHT,
                    1,
                    1
                );
                tmpWidged = statusWidget;
            } else {
                connectWidget = new Gtk.Button({label: _("Connect")});
                connectWidget.connect(
                    "clicked",
                    this._widgetEventHandler.bind(
                        this,
                        {"event": "connect-syncbox", "syncboxid":sb, "object":ipWidget}
                    )
                );
                syncBoxesWidget.attach_next_to(
                    connectWidget,
                    ipWidget,
                    Gtk.PositionType.RIGHT,
                    1,
                    1
                );
                tmpWidged = connectWidget;
            }
            removeWidget = new Gtk.Button({label: _("Remove")});
            removeWidget.connect(
                "clicked",
                this._widgetEventHandler.bind(
                    this,
                    {"event": "remove-syncbox", "syncboxid": sb}
                )
            );
            syncBoxesWidget.attach_next_to(
                removeWidget,
                tmpWidged,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            let connectionsWidget = this._getConnectionWidget(sb, "syncbox");
            syncBoxesWidget.attach_next_to(
                connectionsWidget,
                removeWidget,
                Gtk.PositionType.RIGHT,
                1,
                1
            );

            top++;
        }

        addWidget = new Gtk.Button(
            {label: _("Add Philips Hue HDMI sync box IP")}
        );
        addWidget.connect(
            "clicked",
            this._widgetEventHandler.bind(
                this,
                {"event": "add-syncbox-ip", "object": null}
            )
        );
        syncBoxesWidget.attach(addWidget, 1, top, 5, 1);

        top++;

        return syncBoxesWidget;
    }

    /**
     * Create the widget with advanced settings.
     *
     * @method _buildAdvancedWidget
     * @private
     * @return {Object} the widget with advancedsettings
     */
    _buildAdvancedWidget() {

        let top = 1;
        let labelWidget = null;

        let advancedWidget = new Gtk.Grid(
            {
                hexpand: true,
                vexpand: true,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );

        /**
         * Set bridge connection timeout
         */

        labelWidget = new Gtk.Label(
            {label: _("Philips Hue Bridge connection timeout (seconds):")}
        );
        advancedWidget.attach(labelWidget, 1, top, 1, 1);

        let connectionTimeoutWidget = new Gtk.ComboBoxText();
        connectionTimeoutWidget.append_text("1");
        connectionTimeoutWidget.append_text("2");
        connectionTimeoutWidget.append_text("3");
        connectionTimeoutWidget.append_text("4");
        connectionTimeoutWidget.append_text("5");
        connectionTimeoutWidget.append_text("6");
        connectionTimeoutWidget.append_text("7");
        connectionTimeoutWidget.append_text("8");
        connectionTimeoutWidget.append_text("9");
        connectionTimeoutWidget.append_text("10");
        connectionTimeoutWidget.set_active(this._connectionTimeout - 1);
        connectionTimeoutWidget.connect(
            "changed",
            this._widgetEventHandler.bind(
                this,
                {"event": "connection-timeout", "object": connectionTimeoutWidget}
            )
        )
        advancedWidget.attach_next_to(
            connectionTimeoutWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        /**
         * Set sync box connection timeout
         */

        labelWidget = new Gtk.Label(
            {label: _("Philips Hue HDMI sync box connection timeout (seconds):")}
        );
        advancedWidget.attach(labelWidget, 1, top, 1, 1);

        let connectionTimeoutWidgetSB = new Gtk.ComboBoxText();
        connectionTimeoutWidgetSB.append_text("1");
        connectionTimeoutWidgetSB.append_text("2");
        connectionTimeoutWidgetSB.append_text("3");
        connectionTimeoutWidgetSB.append_text("4");
        connectionTimeoutWidgetSB.append_text("5");
        connectionTimeoutWidgetSB.append_text("6");
        connectionTimeoutWidgetSB.append_text("7");
        connectionTimeoutWidgetSB.append_text("8");
        connectionTimeoutWidgetSB.append_text("9");
        connectionTimeoutWidgetSB.append_text("10");
        connectionTimeoutWidgetSB.append_text("11");
        connectionTimeoutWidgetSB.append_text("12");
        connectionTimeoutWidgetSB.append_text("13");
        connectionTimeoutWidgetSB.append_text("14");
        connectionTimeoutWidgetSB.append_text("15");
        connectionTimeoutWidgetSB.set_active(this._connectionTimeoutSB - 1);
        connectionTimeoutWidgetSB.connect(
            "changed",
            this._widgetEventHandler.bind(
                this,
                {"event": "connection-timeout-sb", "object": connectionTimeoutWidgetSB}
            )
        )
        advancedWidget.attach_next_to(
            connectionTimeoutWidgetSB,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        top++;

        /**
         * Enable/disable debug messages
         */
        labelWidget = new Gtk.Label({
            label: _("Log debug messages:")
        });
        advancedWidget.attach(labelWidget, 1, top, 1, 1);

        let debugWidget = new Gtk.Switch(
            {
                active: Utils.debug,
                hexpand: false,
                vexpand: false,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );
        debugWidget.connect(
            "notify::active",
            this._widgetEventHandler.bind(
                this,
                {"event": "debug", "object": debugWidget}
            )
        )
        advancedWidget.attach_next_to(
            debugWidget,
            labelWidget,
            Gtk.PositionType.RIGHT,
            1,
            1
        );

        return advancedWidget;
    }

    /**
     * Create the widget 'About'.
     *
     * @method _buildBridgesWidget
     * @private
     * @return {Object} the widget 'about'
     */
    _buildAboutWidget() {

        let top = 1;
        let aboutWidget = new Gtk.Grid(
            {
                hexpand: true,
                vexpand: true,
                halign:Gtk.Align.CENTER,
                valign:Gtk.Align.CENTER
            }
        );

        let aboutTextLabel = new Gtk.Label({
            label: `${Me.metadata.name}, ` + _("version") + `: ${Me.metadata.version}, Copyright (c) 2022 Václav Chlumský`
        });

        if (Utils.isGnome40()) {
            aboutWidget.attach(aboutTextLabel, 1, top, 1, 1);
        } else {
            aboutWidget.attach(aboutTextLabel, 1, top, 1, 1);
        }

        top++;
        if (Utils.isGnome40()) {
            aboutWidget.attach(new Gtk.Separator(Gtk.HORIZONTAL), 1, top, 2, 1);
        } else {
            aboutWidget.attach(new Gtk.HSeparator(), 1, top, 2, 1);
        }
        top++;

        let warningText = _(
            "This application makes use of fast changing light effects conditions alone, or in combination with certain content on the screen it may trigger previously undetected epileptic symptoms or seizures in persons who have no history of prior seizures or epilepsy."
        );
        let warningLabel = new Gtk.Label(
            {label: warningText}
        );
        if (Utils.isGnome40()) {
            warningLabel.set_wrap(true);
        } else {
            warningLabel.set_line_wrap(true);
        }
        aboutWidget.attach(warningLabel, 1, top, 1, 1);

        top++;
        if (Utils.isGnome40()) {
            aboutWidget.attach(new Gtk.Separator(Gtk.HORIZONTAL), 1, top, 2, 1);
        } else {
            aboutWidget.attach(new Gtk.HSeparator(), 1, top, 2, 1);
        }
        top++;

        return aboutWidget;
    }

    /**
     * Show modal dialog with a label bridge not found.
     * 
     * @method showBridgeNotFoundDialog
     */
    showBridgeNotFoundDialog() {
        let dialogFailed = new Gtk.Dialog(
            {
                modal: true,
                title: _("Bridge not found")
            }
        );

        let contentArea = dialogFailed.get_content_area();

        let pressButtonLabel = new Gtk.Label({
                label: _("Press the button on the bridge and try again.")
        });

        if (Utils.isGnome40()) {
            contentArea.append(pressButtonLabel);
        } else {
            contentArea.add(pressButtonLabel);
        }

        let button = Gtk.Button.new_with_label(_("OK"));
        button.connect('clicked', () => {
            dialogFailed.destroy();
        });

        button.expand = true;
        button.grab_focus();

        if (Utils.isGnome40()) {
            dialogFailed.add_action_widget(button, 0);
            dialogFailed.show();
        } else {
            contentArea.add(button);
            dialogFailed.show_all();
        }
    }

    /**
     * Show modal dialog for pressing sync box button.
     * 
     * @method showSyncBoxPressDialog
     */
    showSyncBoxPressDialog() {
        if (this._dialogSynBoxPress !== null) {
            this._dialogSynBoxPress.destroy();
            this._dialogSynBoxPress = null;
        }

        let dialogSynBoxPress = new Gtk.Dialog(
            {
                modal: true,
                title: _("Hold HDMI sync box button")
            }
        );

        this._dialogSynBoxPress = dialogSynBoxPress;

        let contentArea = dialogSynBoxPress.get_content_area();

        let pressButtonLabel = new Gtk.Label({
                label: _("While this dialog is shown, hold the button on HDMI sync box\nuntil the led blinks green (~3 seconds) and release.")
        });

        if (Utils.isGnome40()) {
            contentArea.append(pressButtonLabel);
        } else {
            contentArea.add(pressButtonLabel);
        }

        let button = Gtk.Button.new_with_label(_("Cancel"));
        button.connect('clicked', () => {
            this._hueSB.cancelAdding();
            dialogSynBoxPress.destroy();
        });

        button.expand = true;
        button.grab_focus();

        if (Utils.isGnome40()) {
            dialogSynBoxPress.add_action_widget(button, 0);
            dialogSynBoxPress.show();
        } else {
            contentArea.add(button);
            dialogSynBoxPress.show_all();
        }
    }

    unsetDefaultBridge() {
        for (let bridge in this._hue.bridges) {
            if (this._hue.bridges[bridge]["default"] !== undefined) {
                delete(this._hue.bridges[bridge]["default"]);
            }
        }
    }

    /**
     * Handles events from widget in prefs.
     *
     * @method _widgetEventHandler
     * @private
     * @param (object) dictionary with instruction what to do
     */
    _widgetEventHandler(data) {

        let bridgeid;
        let ip;
        let lightId;
        let value;
        let dialog;
        let entry;
        let buttonOk;
        let sb;

        switch(data["event"]) {

            case "connect-bridge":

                bridgeid = data["bridgeid"];
                ip = data["object"].get_text();
                this._hue.bridges[bridgeid]["ip"] = ip;

                if (this._hue.addBridgeManual(ip) === false) {
                    this.showBridgeNotFoundDialog();
                    break;
                }

                this._hue.checkBridges();
                this._refreshPrefs = true;
                this._defaultPage = 0;
                this.writeSettings();
                break;

            case "remove-bridge":

                bridgeid = data["bridgeid"];
                Utils.logDebug(`Removing bridge: ${bridgeid}`);

                delete(this._hue.bridges[bridgeid]);
                if (this._hue.instances[bridgeid] !== undefined) {
                    delete(this._hue.instances[bridgeid]);
                }

                if (this._associatedConnection[bridgeid] !== undefined) {
                    delete(this._associatedConnection[bridgeid]);
                    this.writeAssociatedConnections();
                }

                this._refreshPrefs = true;
                this._defaultPage = 0;
                this.writeSettings();
                break;

            case "set-default-bridge":

                bridgeid = data["bridgeid"];
                Utils.logDebug(`New default bridge is: ${bridgeid}`);

                this.unsetDefaultBridge();
                this._hue.bridges[bridgeid]["default"] = bridgeid;

                this._refreshPrefs = true;
                this._defaultPage = 0;
                this.writeSettings();
                break;

            case "unset-default-bridge":

                Utils.logDebug(`Default bridge unset.`);

                this.unsetDefaultBridge();

                this._refreshPrefs = true;
                this._defaultPage = 0;
                this.writeSettings();
                break;

            case "new-ip":

                ip = data["object2"].get_text();
                data["object1"].destroy();

                if (this._hue.addBridgeManual(ip) === false) {
                    this.showBridgeNotFoundDialog();
                    break;
                }

                this._hue.checkBridges();
                this._refreshPrefs = true;
                this._defaultPage = 0;
                this.writeSettings();
                break;

            case "add-ip":

                dialog = new Gtk.Dialog(
                    {
                        modal: true,
                        title: _("Enter new IP address")
                    }
                );

                entry = new Gtk.Entry();
                if (Utils.isGnome40()) {
                    dialog.get_content_area().append(entry);
                } else {
                    dialog.get_content_area().add(entry);
                }

                buttonOk = new Gtk.Button({label: _("OK")});
                buttonOk.connect(
                    "clicked",
                    this._widgetEventHandler.bind(
                        this,
                        {"event": "new-ip", "object1": dialog, "object2": entry}
                    )
                );

                if (Utils.isGnome40()) {
                    dialog.add_action_widget(buttonOk, 0);
                    dialog.show();
                } else {
                    dialog.get_action_area().add(buttonOk);
                    dialog.show_all();
                }
                break;

            case "discovery-bridges":

                this._hue.checkBridges();
                this._refreshPrefs = true;
                this._defaultPage = 0;
                this.writeSettings();
                break;

            case "position-in-panel":

                this._indicatorPosition = data["object"].get_active();
                this._settings.set_enum(
                    Utils.HUELIGHTS_SETTINGS_INDICATOR,
                    this._indicatorPosition
                );
                break;

            case "icon-pack":

                this._iconPack = data["object"].get_active();
                this._settings.set_enum(
                    Utils.HUELIGHTS_SETTINGS_ICONPACK,
                    this._iconPack
                );
                break;

            case "compact-menu":

                this._compactMenu = data["object"].get_active();
                this._settings.set_boolean(
                    Utils.HUELIGHTS_SETTINGS_COMPACTMENU,
                    this._compactMenu
                );
                break;

            case "zones-first":

                this._zonesFirst = data["object"].get_active();
                this._settings.set_boolean(
                    Utils.HUELIGHTS_SETTINGS_ZONESFIRST,
                    this._zonesFirst
                );
                break;

            case "show-scenes":

                this._showScenes = data["object"].get_active();
                this._settings.set_boolean(
                    Utils.HUELIGHTS_SETTINGS_SHOWSCENES,
                    this._showScenes
                );
                break;

            case "connect-syncbox":

                sb = data["syncboxid"];
                ip = data["object"].get_text();
                this._hueSB.syncboxes[sb]["ip"] = ip;

                this.showSyncBoxPressDialog();
                this._hueSB.addSyncBoxManual(ip);
                break;

            case "remove-syncbox":

                sb = data["syncboxid"];
                Utils.logDebug(`Removing sync box: ${sb}`);

                delete(this._hueSB.syncboxes[sb]);
                if (this._hueSB.instances[sb] !== undefined) {
                    this._hueSB.instances[sb].deleteRegistration();
                    delete(this._hueSB.instances[sb]);
                }

                if (this._associatedConnection[sb] !== undefined) {
                    delete(this._associatedConnection[sb]);
                    this.writeAssociatedConnections();
                }

                this._refreshPrefs = true;
                this._defaultPage = 3;
                this.writeSettings();
                break;

            case "new-syncbox-ip":

                ip = data["object2"].get_text();
                data["object1"].destroy();

                this.showSyncBoxPressDialog();
                this._hueSB.addSyncBoxManual(ip);
                break;

            case "add-syncbox-ip":

                dialog = new Gtk.Dialog(
                    {
                        modal: true,
                        title: _("Enter new IP address")
                    }
                );

                entry = new Gtk.Entry();
                if (Utils.isGnome40()) {
                    dialog.get_content_area().append(entry);
                } else {
                    dialog.get_content_area().add(entry);
                }

                buttonOk = new Gtk.Button({label: _("OK")});
                buttonOk.connect(
                    "clicked",
                    this._widgetEventHandler.bind(
                        this,
                        {"event": "new-syncbox-ip", "object1": dialog, "object2": entry}
                    )
                );

                if (Utils.isGnome40()) {
                    dialog.add_action_widget(buttonOk, 0);
                    dialog.show();
                } else {
                    dialog.get_action_area().add(buttonOk);
                    dialog.show_all();
                }
                break;

            case "connection-timeout":

                this._connectionTimeout = data["object"].get_active() + 1;
                this._settings.set_int(
                    Utils.HUELIGHTS_SETTINGS_CONNECTION_TIMEOUT,
                    this._connectionTimeout
                );
                break;

            case "connection-timeout-sb":

                this._connectionTimeoutSB = data["object"].get_active() + 1;
                this._settings.set_int(
                    Utils.HUELIGHTS_SETTINGS_CONNECTION_TIMEOUT_SB,
                    this._connectionTimeoutSB
                );
                break;

            case "debug":

                Utils.debug = data["object"].get_active();
                this._settings.set_boolean(
                    Utils.HUELIGHTS_SETTINGS_DEBUG,
                    Utils.debug
                );
                break;

            case "notify-light-toggled":

                lightId = data["notify-lightid"];

                if (data["object"].active) {
                    let notifyData = {};
                    if (this._notifyLights[lightId] !== undefined) {
                        notifyData = this._notifyLights[lightId];
                    }

                    /* if no data provided, check if some other light has some data */
                    if (Object.keys(notifyData).length === 0) {
                        for (let i in this._notifyLights) {
                            if (Object.keys(this._notifyLights[i]).length > 0) {
                                notifyData = this._notifyLights[i];
                                break;
                            }
                        }
                    }

                    this._notifyLights[lightId] = notifyData;

                } else {
                    if (this._notifyLights[lightId] !== undefined) {
                        delete(this._notifyLights[lightId]);
                    }
                }

                this.writeNotifyLightsSettings();
                break;

            case "notify-light-brightness":

                for (let i in this._notifyLights){

                    if (this._notifyLights[i] === undefined) {
                        this._notifyLights[i] = {};
                    }

                    this._notifyLights[i]["bri"] = Math.round(data["object"].value);
                }

                this.writeNotifyLightsSettings();
                break;

            case "notify-light-color":

                for (let i in this._notifyLights){

                    if (this._notifyLights[i] === undefined) {
                        this._notifyLights[i] = {};
                    }

                    let notifyLightColor = data["object"].get_rgba();
                    this._notifyLights[i]["r"] = Math.round(notifyLightColor.red * 255);
                    this._notifyLights[i]["g"] = Math.round(notifyLightColor.green * 255);
                    this._notifyLights[i]["b"] = Math.round(notifyLightColor.blue * 255);
                }

                this.writeNotifyLightsSettings();
                break;

            case "entertainment-autostart":
                if (this._entertainment[data["bridgeid"]] === undefined) {
                    this._entertainment[data["bridgeid"]] = {}
                }

                value = parseInt(data["object"].get_active_id());
                this._entertainment[data["bridgeid"]]["autostart"] = value;
                this.writeEntertainmentSettings();
                break;

            case "entertainment-mode":
                if (this._entertainment[data["bridgeid"]] === undefined) {
                    this._entertainment[data["bridgeid"]] = {}
                }

                value = parseInt(data["object"].get_active_id());
                this._entertainment[data["bridgeid"]]["mode"] = value;
                this.writeEntertainmentSettings();
                break;

            case "entertainment-intensity":
                if (this._entertainment[data["bridgeid"]] === undefined) {
                    this._entertainment[data["bridgeid"]] = {}
                }

                value = Math.round(data["object"].value);
                this._entertainment[data["bridgeid"]]["intensity"] = 255 - value + 40;
                this.writeEntertainmentSettings();
                break;

            case "entertainment-brightness":
                if (this._entertainment[data["bridgeid"]] === undefined) {
                    this._entertainment[data["bridgeid"]] = {}
                }

                value = Math.round(data["object"].value);
                this._entertainment[data["bridgeid"]]["bri"] = value;
                this.writeEntertainmentSettings();
                break;

            case "force-english":

                this._settings.set_boolean(
                    Utils.HUELIGHTS_SETTINGS_FORCE_ENGLISH,
                    data["object"].get_active()
                );
                break;

            case "connection-toggled":

                let device = data["device"];
                let connection = data["connection-id"];
                if (this._associatedConnection[device] === undefined) {
                    this._associatedConnection[device] = {};
                    this._associatedConnection[device]["connections"] = [];
                    this._associatedConnection[device]["type"] = [data["device-type"]];
                }

                if (data["object"].active) {
                    if (! this._associatedConnection[device]["connections"].includes(connection)) {
                        this._associatedConnection[device]["connections"].push(connection);
                    }
                } else {
                    if (this._associatedConnection[device]["connections"].includes(connection)) {
                        let index = this._associatedConnection[device]["connections"].indexOf(connection);
                        index = this._associatedConnection[device]["connections"].splice(index, 1);
                    }
                }

                this.writeAssociatedConnections();
                break;

            case undefined:
            default:
                Utils.logDebug(`Unknown prefs event`);
          }
    }

    /**
     * Gets all known connections
     * 
     * @method getConnections
     * @returns {Object} array of conections
     */
    getConnections() {

        let c = [];

        let client = NM.Client.new(null);

        let connections = client.get_connections();
        for (let connection of connections) {
            if (! Utils.allowedConnectionTypes.includes(connection.get_connection_type())) {
                continue;
            }

            c.push(connection.get_id());
        }

        return c;
    }

    /**
     * Creates widget with button that provides selection of associated networks
     * 
     * @param {String} id of the device
     * @param {String} deviceType like "bridge"...
     * @returns {Object} widget with button providing connection selection
     */
    _getConnectionWidget(id, deviceType) {

        let connections = this.getConnections();

        /* add unknown but saved connections */
        for (let d in this._associatedConnection) {
            if (this._associatedConnection[d]["connections"] === undefined) {
                continue;
            }

            for (let c in this._associatedConnection[d]["connections"]) {
                if (!connections.includes(this._associatedConnection[d]["connections"][c])) {
                    connections.push(this._associatedConnection[d]["connections"][c]);
                }
            }
        }

        let connectionsMenuButton = new Gtk.MenuButton({label: _("Associated networks")});

        let connectionsMenu;
        let connectionsListBox; /* used for Gnome 40*/
        let connectionsWindow; /* used for Gnome 40*/
        if (Utils.isGnome40()) {
            connectionsMenu = new Gtk.Popover();
            connectionsMenuButton.set_popover(connectionsMenu);
            connectionsWindow = new Gtk.ScrolledWindow();
            connectionsWindow.min_content_width = 300;
            connectionsWindow.min_content_height = 200;
            connectionsListBox = new Gtk.Box(
                {
                    orientation: Gtk.Orientation.VERTICAL
                }
            );
            connectionsWindow.set_child(connectionsListBox);
        } else {
            connectionsMenu = new Gtk.Menu();
            connectionsMenuButton.set_popup(connectionsMenu);
        }

        for (let c in connections) {
            if (Utils.isGnome40()) {
                let connectionBox = new Gtk.Box(
                    {
                        orientation: Gtk.Orientation.HORIZONTAL
                    }
                );
                connectionBox.append(new Gtk.Label(
                    {
                        label: connections[c],
                        hexpand: true,
                        halign:Gtk.Align.START,
                    }
                ));

                connectionsListBox.append(connectionBox);
                let isActive = false;

                if (this._associatedConnection[id] !== undefined &&
                    this._associatedConnection[id]["connections"] !== undefined) {

                    if (this._associatedConnection[id]["connections"].includes(connections[c])) {
                        isActive = true;
                    }
                }

                let connectionSwitch = new Gtk.Switch(
                    {
                        active: isActive
                    }
                );

                connectionSwitch.connect(
                    "notify::active",
                    this._widgetEventHandler.bind(
                        this,
                        {
                            "event": "connection-toggled",
                            "device": id,
                            "device-type": deviceType,
                            "connection-id": connections[c],
                            "object": connectionSwitch
                        }
                    )
                )
                connectionBox.append(connectionSwitch);

            } else {
                /* Gnome 3.x */

                let connectionMenuItem = new Gtk.CheckMenuItem({label: connections[c]});

                if (this._associatedConnection[id] !== undefined &&
                    this._associatedConnection[id]["connections"] !== undefined) {

                    if (this._associatedConnection[id]["connections"].includes(connections[c])) {
                        connectionMenuItem.active = true;
                    }
                }

                connectionMenuItem.connect(
                    "toggled",
                    this._widgetEventHandler.bind(
                        this,
                        {
                            "event": "connection-toggled",
                            "device": id,
                            "device-type": deviceType,
                            "connection-id": connections[c],
                            "object": connectionMenuItem
                        }
                    )
                )
                connectionsMenu.append(connectionMenuItem);
            }
        }

        if (Utils.isGnome40()) {
            connectionsMenu.set_child(connectionsWindow);
        } else {
            connectionsMenu.show_all();
        }

        return connectionsMenuButton;
    }
}

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @method init
 */
function init() {

    ExtensionUtils.initTranslations();

    hue = new Hue.Phue(false);
    hueSB = new HueSB.PhueSyncBox({async: false});

    log(`initializing ${Me.metadata.name} Preferences`);
}

/**
 * This function is called when the preferences window is first created to build
 * and return a Gtk widget.
 *
 * @method buildPrefsWidget
 * @return {Object} returns the prefsWidget
 */
function buildPrefsWidget() {

    let huePrefs = new Prefs(hue, hueSB);

    return huePrefs.getPrefsWidget();
}
