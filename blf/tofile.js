// Functions that use the arrays and objects to put data into the bianry buffer

// Functions and constants to support the binary output
const cs = require('./constants.js')
const blf = require("./support.js"); // Support functions
const fs = require ("fs"); // File library


// Pull rows of vertices and send to the output buffer
function vert_to_file(buffer, wdv_index, line_array,dest) {

    const data = dest.data;
    var index = wdv_index; // index point passed in is copied
    
      // Here's the dummy, note first element of array is not used
      index = text_vec_to_bin(["v","0","0","0"], buffer, index);
  
      line_array.forEach(function(value) {
        index = text_vec_to_bin(data[value], buffer, index);
      }); // End of foreach callback and loop
      
      console.log("Vertices coordinates converted (including pad) %d",(index)/cs.FLOAT_SIZE);
    return (index);
} // End of vert_to_file
  
 // Pull rows of faces and send to the text buffer
function face_to_file(buffer, wdv_index, line_array,dest,slash_index) {

    const data = dest.data;
    var index = wdv_index;
    var count = 0;
  
      if (slash_index < 0 || slash_index > 1) // Check just either side of a single slash
      {
        console.log("Slash_index should be 0 or 1");
        process.exit();
      }
       line_array.forEach(function(value) {
        // It's a face so output 3 vertex index numbers
        for (n=1;n<4;n++) {
          // Convert text number into a real integer from left or right of slash
          // to allow for vertex or texel coordinates to be fetched
          var temp_int=parseInt(data[value][n].split('/')[slash_index]);

          // There may not be anything after the slash if the material has been exported without UVs
          // which makes sense if a block colour but seems unpredictable from Blender
          if (!((temp_int > 0) && (temp_int < Number.MAX_SAFE_INTEGER))) temp_int = 0; // Unsure how NaN is handled in files or .bin import to ESP32
  
          // Put it into the byte array
          buffer.setUint16(index,temp_int,true);
          index += cs.UINT16_SIZE; // There's no easy sizeof() for this
          count ++;
        }
      }); // End of foreach callback and loop
      if (slash_index == 0) console.log("Nvertices converted %d",(index)/cs.UINT16_SIZE);
      if (slash_index == 1) console.log("Texel indices converted %d",(index)/cs.UINT16_SIZE);
  
      if (count & 0x0001) index += cs.UINT16_SIZE; // Pad to 4 bytes
  
    return(index);
} // End of face_to_file
  
// Pull rows of vertices and send to the output buffer
function vts_to_file(buffer, wdv_index, line_array,dest) {

    const data = dest.data;
    var index = wdv_index; // index point passed in is copied
  
      // Make a binary array large enough
      // Each line has 2 float (ie 4 bytes) vertices and we need an initial dummy to allow index to start at 1
      
      // Here's the dummy, note first element of array is not used
      index = text_vec_to_bin(["vt","0","0"], buffer, index);
  
      // Now add the vertices
      line_array.forEach(function(value) {
        index = text_vec_to_bin(data[value], buffer, index);
      }); // End of foreach callback and loop
      console.log("VTS UV coordinates converted (including pad) %d",(index)/cs.FLOAT_SIZE);

    return (index);
} // End of vts_to_file

// Put a text-coded vector into the binary buffer at an index and return new buffer index
// Note that it expects an element at [0] which is ignored
function text_vec_to_bin(vector, buffer, index) {

    // Skip first element of the array which is the type of vector ie v or vt in this OBJ file
    for (var n = 1; n < vector.length; n++) {
        // Convert text number into a real number with some rounding although the float 32 will not be precise
        const temp_float=parseFloat(vector[n]);
        const bin_out=blf.round(temp_float);
        //console.log("Vertex %f",bin_out);
        // Put it into the byte array
        buffer.setFloat32(index,bin_out,true);
        index += cs.FLOAT_SIZE;
    }
    return(index);
}

// Put a float vector into the binary buffer at an index and return new buffer index
// Note that it expects the vector to be in [0] [1] etc unline the above
function float_vec_to_bin(vector, buffer, index) {

  for (var n = 0; n < vector.length; n++) {
      // Put it into the byte array
      buffer.setFloat32(index,vector[n],true);
      index += cs.FLOAT_SIZE;
  }
  return(index);
}

// Put a 32bit offset into the binary buffer at an index and return new buffer index
function uint32_to_bin(offset, buffer, index) {

  buffer.setUint32(index,offset,true);
  index += cs.UINT32_SIZE;

  return(index);
}

// Output an array of face attributes in same order as the main face array
function attribute_to_file(buffer, wdv_index, mtl_obj,dest) {

    var index=wdv_index; // no padding so start at the beginning of this block
    var count = 0;
  
    dest.face_mtl.forEach(function(value) {
      
        // Find the index of this material in the list and output that 
        var temp_int = mtl_obj.mat_names.indexOf(value); 
  
        // Put it into the byte array
        buffer.setUint16(index,temp_int,true);
        index += cs.UINT16_SIZE; // There's no easy sizeof() for this
        count++;
        }); // End of foreach callback and loop
      console.log("Attributes exported %d",(index)/cs.UINT16_SIZE);
  
      if (count & 0x0001) index += cs.UINT16_SIZE; // Padd to 4 bytes
  
      return(index);
  } // End of outputting attributes
  
  // Process the mtl file into the partition binary using functions from header system
  function palette_to_file(buffer,wdv_index,source)
  {
    // Format is a uint32_t count of materials followed by
    // Attribute word that is coded followed by value which could be:
    // PAL_PLAIN RGB888 colour
    // PAL_TEXOFF Offset into texture table
    // It is wasteful of memory but simpler to write & pull whole words than consider word boundaries
    const tx = require ("./textures");
    const evtext = "EVENT0x";
    var index=wdv_index; // no padding so start at the beginning of this block
  
    buffer.setUint32(index,source.mat_names.length,true); // number of materials 
    index += cs.UINT32_SIZE; 
  
    for (var i = 0; i < source.mat_names.length;i++) {
      
      // Check if material name indicates a game event
      // 0x included here but will step back and send to parseInt
      var event_number = 0; // Default to zero
      var event_index = source.mat_names[i].indexOf(evtext);
      if (event_index != -1)
      {
        // There is an event name
        // First try to read the hex code following, use index and the next 8 characters
        var event_str = source.mat_names[i].substring(event_index+evtext.length - 2,8 + event_index+evtext.length);
        event_number = parseInt(event_str,16);
      }

      if (source.TextureHeight[i]=='true') // Check if this material has a texture or not - NB it's a string
      {
        var this_texture_name = source.TextureImage[i];
        
        console.log("Texture needed is " + this_texture_name);
        
        // Find the texture name in the textures array
        var tex_offset = 0xffffffff;
        tx.textures.find(function(value){
          if(value[0] == this_texture_name)
          {
            return(tex_offset = value[1]);
          }
          else return(false);
        }); // end of find loop
  
        if (tex_offset != 0xffffffff) console.log ("Found at" + blf.numToHexString(tex_offset));
        else
        {
          console.log("Texture cannot be found " + this_texture_name);
          process.exit();
        }
      
      buffer.setUint32(index,cs.PAL_TEXOFF,true);
      index += cs.UINT32_SIZE; 

      // Ns of the texture is included in mtl file
      const Ns = parseFloat(source.Ns[i]); 
      console.log("Texture Ns is " + Ns);

      // The texture offset resides in the rgb 32 bit word but the high order byte
      // isn't needed as texture .bin will never be that massive, so put Ns into it
      tex_offset = blf.makeOffset(Ns,tex_offset);

      // Include the offset of the required texture 
      buffer.setUint32(index,tex_offset,true);
      index += cs.UINT32_SIZE; 
      }
      else // No texture for this mtl
      {
        const Ns = parseFloat(source.Ns[i]); 
        const red = parseFloat(source.KdR[i]);
        const green = parseFloat(source.KdG[i]);
        const blue = parseFloat(source.KdB[i])
        const rgb = blf.makeRgb888(Ns,red,green,blue);
  
        // Indicate the type as plain rgb888 colour
        buffer.setUint32(index,cs.PAL_PLAIN,true);
        index += cs.UINT32_SIZE; 
  
        buffer.setUint32(index,rgb,true);
        index += cs.UINT32_SIZE; 
    }
    // Send the event number to binary buffer for both block colours and texture
    // which is inefficient as most palette attributes will not have this defined
    buffer.setUint32(index,event_number,true);
    index += cs.UINT32_SIZE; 
  }; // End of material for loop
    return(index);
} // End of outputting palette
  
// Input the structure that outlines the layout of chunks and buffer with an index
// and return an updated index
function chunk_param_to_file(buffer, index, chunk_param) {
  // Place the 5 chunk parameters we need
  buffer.setUint16(index,chunk_param.xmin,true); index += cs.INT16_SIZE;
  buffer.setUint16(index,chunk_param.zmin,true); index += cs.INT16_SIZE;
  buffer.setUint16(index,chunk_param.xchunks,true); index += cs.UINT16_SIZE;
  buffer.setUint16(index,chunk_param.zchunks,true); index += cs.UINT16_SIZE;
  buffer.setUint16(index,chunk_param.width,true); index += cs.UINT16_SIZE;
  buffer.setUint16(index,0xffff,true); index += cs.UINT16_SIZE; // padding

  return (index);
} // end of chunk_param_to_file

function get_file_size(this_filename) // Returns file size, hopefully matches the real buffer size
{
  var stats = fs.statSync(this_filename);
  var fileSizeInBytes = stats.size;
  return (fileSizeInBytes);
} // End of get_file_size

// An object to keep track of worlds as .bon files made from .obj files
const bon_worlds = {
  //index: 0, // position in the array
  items: [],
  add_offset(this_offset) { // Add an offset to the object
    this.items.push(this_offset);
  },
  add_count(this_type,this_world,this_frame) { // Add a world count to the object

    this_world = this_world | (this_type << 24); // Set high order bits to note world type, rather than offset
    this_world = this_world | (this_frame << 16);  // Shift into 2nd highest byte
    
    console.log ("Pushed count is "+ blf.numToHexString(this_world));
    const place_at = this.items.length - (this_frame); // Find point before these sizes
    this.items.splice(place_at,0,this_world); // Insert the definition / count value BEFORE the sizes
  },
  size() { // return the array's size before any processing
    return (this.items.length);
  },
  give(initial_offset) { // Return the array for use
    var output = [];
    var adjusted_member;
    var internal_offset = 0;
      // Scan through the array and calculate new offsets as required
      this.items.forEach( member => {
        if (member & 0x10000000) output.push(member); // Do not adjust world descriptor elements
        else {
          adjusted_member = initial_offset + internal_offset; // Adjust the size to become an offset in the file
          internal_offset += member; // Increase the offset as the sizes are parsed
          output.push(adjusted_member); 
        }
      });
    return(output);
  }
};

// Take a .bon file and add it to the destination
function concat_bon_file(bon_filename, dest_filename)
{
  console.log("Processing the .bon file for: "+ bon_filename);

  try {
    var bon_in = fs.readFileSync(bon_filename+".bon");
    } catch(err){
      console.log("There was a problem reading a world .bon file");
      process.exit();
  }

  try {
      fs.appendFileSync(dest_filename + ".bin", bon_in, {encoding: null,});
      } catch(err){
        console.log("There was a problem writing a world to the binary file");
        process.exit();
     }
}; // End of concat_bon_file


// Allow these to be used externally
module.exports = { vert_to_file, face_to_file, vts_to_file, attribute_to_file, palette_to_file, float_vec_to_bin, uint32_to_bin, chunk_param_to_file, get_file_size, bon_worlds, concat_bon_file };