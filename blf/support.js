const cs = require('./constants.js')


// Support functions

// Clamp which isn't builtin to .js as yet
function clamp(num,min,max) {
  return Math.min(Math.max(num, min), max);
} // end of clamp

// Round a floating point number to 4 decimal places
function round(input) {
  return (Math.round((input + Number.EPSILON) * 10000) / 10000);
}

// Convert a number to a foxed length hex string for display
function numToHexString(value) {
    var output = " 0x";
    output += value.toString(16).padStart(8,'0');
    return (output);
} // end of numToHexString

// Combine 4 floats into a 32 bit integer-like value
function makeRgb888(Ns,redf,greenf,bluef) { 
  
    // Start by adjusting the float colour which is 0 to 1.0 into 0 to 255  
    const temp_red = clamp(Math.round(redf * 255),0,255);
    const temp_green = clamp(Math.round(greenf * 255),0,255);
    const temp_blue = clamp(Math.round(bluef * 255),0,255);
    
    // Adjust specular value
    const temp_Ns = clamp(Math.round(Ns / 4),0,255); // Ns varies 0 to 1000
    
    // collate these into a sinlge large rgb888 style number, with Ns specular value in first byte (traditionally this is alpha)
    const temp_rgb=(temp_Ns*256*256*256) + (temp_red*256*256) + (temp_green*256) + temp_blue;

    return(temp_rgb);
  } // end of makeRgb888

  // Combine a float with offset into a 32 bit integer-like value
function makeOffset(Ns,offset) { 
  
  // Adjust specular value
  const temp_Ns = clamp(Math.round(Ns / 4),0,255); // Ns varies 0 to 1000
  
  // Set offset bounds to be safe
  const temp_offset = clamp(offset,0,0xffffff); // MB uses lower order 3 bytes

  // collate these into a single large rgb888 style number, with Ns specular value in first byte (traditionally this is alpha)
  const mod_offset=(temp_Ns*256*256*256) + temp_offset;

  return(mod_offset);
} // end of makeRgb888

// Opens a text-like file and parses it into a ragged array
function read_obj(filepath,destination_obj){

  const fs = require('fs');
  const { parse } = require('csv-parse/sync');
    
    try {
        // Reads a text string
        // sync is enough and easier to debug
        var string_in = (fs.readFileSync(filepath,'utf8'));
            } catch(err){
        console.log("There was a problem reading the file, check it exists and permissions");
        process.exit();
    }
    //console.log(string_in);

    // This was more complex to set up than Google's Utilities.parseCsv() but seems right now
    destination_obj.data = parse(string_in,{relax_column_count: true,skip_empty_lines: true,delimiter: ' '});
} // End of read_obj

// A number is rounded up to the word size to pad an array allocation
// so that the next array falls on a word boundary
function pad_to_word(input)
{
  return (~(cs.WORD_SIZE - 1) & cs.WORD_SIZE - 1 + input);
} // end of pad_to_word

// Make texture image name from the mtl filename which might be split across an array if it contained spaces
// Also remove extension and leading path
function makeImageName(filename_array) {
    
    const Path = require('path'); // Built-in module to parse file paths, no need to mess with strings

    var texturename="";
    // Concatenate parts across the ragged array
    for (i=1;i<filename_array.length;i++)
    {
      texturename += filename_array[i]+' ';
    }
    // Use path to pull the raw filename from a path
    texturename = Path.parse(texturename).name;
    
    return (texturename);
  } // end of makeImageName

  // A Vec3f object constructor with methods
  function Vec3f (x, y, z)
  {
    this.x = x;
    this.y = y;
    this.z = z;

    // These methods included but not used
    this.add = function add(input_vec) { // Method to add another vector to 'this'
      this.x = this.x + input_vec.x;
      this.y = this.y + input_vec.y;
      this.z = this.z + input_vec.z;
      return this;
    };

    this.divby3 = function divby3() { // Method to divide by three to make a face centre average
      this.x /= 3; 
      this.y /= 3;
      this.z /= 3;
      return this;
    };
  } // End of Vec3f object

// Allow these to be used externally
module.exports = { clamp , round, read_obj , pad_to_word , makeRgb888 , makeOffset, makeImageName , numToHexString, Vec3f };