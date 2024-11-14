// Constants used across the modules
// This approach from stackoverflow
function define(name,value) {
    Object.defineProperty(exports, name, {
        value:      value,
        writable:   false,
        enumerable: true
    })
};

// Types of word in the partition palette
    define ("PAL_PLAIN" , 0x01); // Basic plain rgb888 colour
    define ("PAL_TEXOFF" , 0x02); // Offset to a texture with a DIB in texture partition

// Word sizes for these types as no easy sizeof()
    // Must all be powers of two
    define ("FLOAT_SIZE" , 4);
    define ("UINT16_SIZE" , 2);
    define ("INT16_SIZE" , 2);
    define ("PTR_SIZE" , 4);
    define ("UINT32_SIZE" , 4);
    define ("WORD_SIZE" , 4);

// Constants for chunking
    define ("CH_ERROR_MARGIN", 0.1);
    define ("CH_SIZE" , 10 );

// Constants for the world
    define ("MAX_WORLD", 0x0100000); // ESP32 world partition is currently set at 1MB