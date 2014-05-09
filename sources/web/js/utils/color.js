/**
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @constructor
 */
function ColorRgb(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
}

ColorRgb.Colors = {
    BLACK: new ColorRgb(0, 0, 0),
    WHITE: new ColorRgb(255, 255, 255),
    RED: new ColorRgb(255, 0, 0),
    LIME: new ColorRgb(0, 255, 0),
    BLUE: new ColorRgb(0, 0, 255),
    YELLOW: new ColorRgb(255, 255, 0),
    AQUA: new ColorRgb(0, 255, 255),
    MAGENTA: new ColorRgb(255, 0, 255),
    SILVER: new ColorRgb(192, 192, 192),
    GRAY: new ColorRgb(128, 128, 128),
    MAROON: new ColorRgb(128, 0, 0),
    OLIVE: new ColorRgb(128, 128, 0),
    GREEN: new ColorRgb(0, 128, 0),
    PURPLE: new ColorRgb(128, 0, 128),
    TEAL: new ColorRgb(0, 128, 128),
    NAVY: new ColorRgb(0, 0, 128)
};

/**
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
ColorRgb.prototype.set = function (r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
};

ColorRgb.prototype.copy = function () {
    return new ColorRgb(this.r, this.g, this.b);
};
/**
 *
 * @param {ColorRgb} colorRgb
 */
ColorRgb.prototype.add = function (colorRgb) {
    this.r += colorRgb.r;
    this.g += colorRgb.g;
    this.b += colorRgb.b;
};

/**
 *
 * @param {ColorRgb} colorRgb
 */
ColorRgb.prototype.subtract = function (colorRgb) {
    this.r -= colorRgb.r;
    this.g -= colorRgb.g;
    this.b -= colorRgb.b;
};

/**
 *
 * @param {ColorRgb} a current color
 * @param {ColorRgb} b new color
 * @constructor
 */
function ColorRgbChangingPair(a, b) {
    this.a = a;
    this.b = b;
}

/**
 *
 * @param {Image} img
 * @param {ColorRgbChangingPair} changingColorPairs
 * @return {string} url
 */
function recolorImage(img, changingColorPairs) {
    var c = document.createElement('canvas');
    var ctx = c.getContext("2d");
    var w = img.width;
    var h = img.height;
    c.width = w;
    c.height = h;
    // draw the image on the temporary canvas
    ctx.drawImage(img, 0, 0, w, h);

    // pull the entire image into an array of pixel data
    var imageData = ctx.getImageData(0, 0, w, h);

    // examine every pixel,
    // change any old rgb to the new-rgb
    for (var i = 0; i < imageData.data.length; i += 4) {
        // is this pixel the old rgb?
        for (var j = 0; j < changingColorPairs.length; j++) {
            var currentColor = changingColorPairs[j].a;
            var newColor = changingColorPairs[j].b;
            if (imageData.data[i] == currentColor.r && imageData.data[i + 1] == currentColor.g && imageData.data[i + 2] == currentColor.b) {
                // change to your new rgb
                imageData.data[i] = newColor.r;
                imageData.data[i + 1] = newColor.g;
                imageData.data[i + 2] = newColor.b;
                break;
            }
        }
    }
    // put the altered data back on the canvas
    ctx.putImageData(imageData, 0, 0);
    var url = c.toDataURL("image/png");
    try {
        c.remove();
    } catch (e) {
        console.error("recolorImage: " + e);
    }
    return url;
}

/**
 *
 * @param {Image} img
 * @param {ColorRgbChangingPair} changingColorPair
 * @return {string} url
 */
function recolorFullImage(img, changingColorPair) {
    var c = document.createElement('canvas');
    var ctx = c.getContext("2d");
    var w = img.width;
    var h = img.height;
    c.width = w;
    c.height = h;
    // draw the image on the temporary canvas
    ctx.drawImage(img, 0, 0, w, h);

    // pull the entire image into an array of pixel data
    var imageData = ctx.getImageData(0, 0, w, h);

    // examine every pixel,
    // change any old rgb to the new-rgb
    var imageDataColor = new ColorRgb(0, 0, 0);
    for (var i = 0; i < imageData.data.length; i += 4) {
        // transparent
        if (imageData.data[i] === 0 && imageData.data[i + 1] === 0 && imageData.data[i + 2] === 0 && imageData.data[i + 3] === 0) {
            continue;
        }

        var currentColor = changingColorPair.a;
        var newColor = changingColorPair.b;
        imageDataColor.set(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);

        // offset to main color
        imageDataColor.subtract(currentColor);
        imageDataColor.add(newColor);

        imageData.data[i] = imageDataColor.r;
        imageData.data[i + 1] = imageDataColor.g;
        imageData.data[i + 2] = imageDataColor.b;
    }
    // put the altered data back on the canvas
    ctx.putImageData(imageData, 0, 0);
    var url = c.toDataURL("image/png");
    try {
        c.remove();
    } catch (e) {
        console.error("recolorFullImage: " + e);
    }
    return url;
}
