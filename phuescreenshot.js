'use strict';

/**
 * screenshot
 * JavaScript screenshot capturer.
 *
 * @author Václav Chlumský
 * @copyright Copyright 2021, Václav Chlumský.
 */

 /**
 * @license
 * The MIT License (MIT)
 *
 * Copyright (c) 2021 Václav Chlumský
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

const Screenshot = imports.ui.screenshot;
const Shell = imports.gi.Shell;
const GObject = imports.gi.GObject;


/**
 * PhueScreenshot class for work with screenshots
 *
 * @class PhueScreenshot
 * @constructor
 * @private
 * @return {Object} instance
 */
var PhueScreenshot =  GObject.registerClass({
    GTypeName: "PhueScreenshot",
    Signals: {
        "cursorColor": {}
    }
}, class PhueScreenshot extends GObject.Object {

    _init(props={}) {
        super._init(props);
        this._screenshot = new Shell.Screenshot();
    }

    /**
     * Promise to take color of coordinates
     * 
     * @method pickCoordinatesColor
     * @param {Object} coordinates [x, y]
     */
    pickCoordinatesColor(c) {
        return new Promise((resolve, reject) => {
            try {
                let [x, y] = c;
                
                this._screenshot.pick_color(x, y, (o, res) => {
                    let [, color] = this._screenshot.pick_color_finish(res);

                    resolve({
                        color: color,
                        x: x,
                        y: y
                    });
                });
            } catch(e) {
                reject(e.message);
            }
        });
    }

    /**
     * Takes coodrinates of cursor pointer
     * 
     * @method updateCursorColor
     */
    updateCursorColor() {
        this.pickCoordinatesColor(global.get_pointer()).then(
            this._updateCursorColorFinished.bind(this)
        );
    }

    /**
     * Finisher of cursor color picking.
     * 
     * @method _updateCursorColorFinished
     * @param {Object} object with color and coordinates
     */
    _updateCursorColorFinished(p) {
        this.cursorColor = p.color;
        this.emit("cursorColor");
    }

    /**
     * Picks color of coordianets on screenshot
     * 
     * @method getColorPixel
     * @param {Number} x coordiante
     * @param {Number} y coordinate
     * @return {Object} color
     */
    async getColorPixel(x, y) {
        [this._color] = await this._screenshot.pick_color(x, y);
        return this._color;
    }
});
    