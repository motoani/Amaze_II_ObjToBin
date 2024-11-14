// The textures that we use currently as they appear in the fort_texture.bin file
// Note 128 x 128 is 64k, 128 width is probably ideal and efficient but not compulsory
// as dimensions are embedded in dib header and used in renderer
// Make or import a texture and adjust the bitmap size as required, widith really should be a power of two
// Export as a .dib using an online tool, eg https://xaplor.com/image-to-dib
// Concatenate this .dib onto texture .bin
// Add the texture to this list and note its starting offset, which can be found by searching for
// 28 00 00 00 80 00 00 00 80 00 00 00 in a hex editor such as HxD https://mh-nexus.de/en/
// The resulting .bin should be uploaded onto the ESP32 partition called 'textures'

const textures= [
    ['44_bark texture-seamless',0x00000],
    ['19_dirt road texture-seamless',0x12228],
    ['19_dirt road texture-corner',0x22250],
    ['grass',0x32278],
    ['rooftiles',0x422a0],
    ['simple_office',0x522c8],
    ['stone_wall_modified',0x5d0f0],
    ['thatch',0x6d118],
    ['wood_study_3_by_devin_busha_d2fnx0k',0x7d140],
    ['Rug68percent',0x8d168], // From https://www.pennymorrison.com/products/multi-roman-woven-rug
    ['Bookcase_11083205',0x9d190], // From https://pngtree.com/freepng/illustrated-bookcase-sticker-vector_11083205.html 
];

module.exports = { textures };