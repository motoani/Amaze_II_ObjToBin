// Converted to node.js from June 2024 as GoogleScript API was showing limitions
// with file handling and the spreadsheet services weren't really needed
// as core operations take place on the arrays rather than cells
// Goal is to write binary files to place in ESP32 partition which
// will separate the world from code and hopefully allow mega worlds

// 01 using appends for each block of data but that doesn't allow an intial header
// 02 store blocks and then send after header, safer than trying to overwrite at the beginning
// 03 Breaking into modules for better code structure
// 04 How to manage animations - stores all aspects so vertices and palettes can change!
// 05 Dealing with missing and duplicate afces in chunks - consider a sequential approach of exact, margins, centroid


// Header has a list of the world layers that illustrates their type and complexity
// 1. The header list of layers has a code to describe the world type
//      Currently 0x1e or 0x1f in most significant byte, then the number of frames
//      ANDING highest byte with 0x10000000 shows that it is a descriptor as offset will never be that big
//      although this never needs to be checked as counts define the structure unambiguously
//      Note that this bit IS checked as the conversion is done in this script
// 2. This descriptor word is followed by the appropriate offsets from start of header to the word layers
// 3. If the descriptor word is 0x00000000 then that's the end

// To keep it simple we could assume that each frame has a duration of 16ms and access as per cumulative frame duration
// I've chosen a power of 2 for duration so we can access by ANDing time with mask
// A merit of this system is that a list link isn't needed in every header, it can be appended at the end, just like chunks
// The offset to this, and the data, is only required in a base header which lies outside the world layers 

// First made in Google API in August 2023 and vt texel lines added in January 2024
// Assumes all face vertices have a vt index, as is exported by Blender
// even though this isn't required if no texture is included in MTL file

// Various bugs in chunk edges and textures without Kd corrected May 2024
// Also removed array size definitions as they aren't used in current chunk-fed 
// renderer and will get duplicated if multiple layout used

// User should alter the rows here for their own purposes
// Source file names as an array which will be built into one big binary
const sources = ["beachbase", "beachrest", "beachball"]; // an extension of .obj is presumed

// Destination file name
const dest_filename = "beach_out"; // an extension of .bin is presumed and added
// Start point (eye) and view (direction) are put in the world binary - Don't start at 0.0f values as it might miss the base
const Eye = [1.0, 1.7, 63.0];
const Direction = [-0.3939, 0, -0.9191]; // Normalisation is done at points but vector should have a length of 1
/*
    const sources = ["town_base","town_rest","town_jewel","town_blades"];//,"town_water",]; // an extension of .obj is presumed

    // Destination file name
    const dest_filename = "townshineani3"; // an extension of .bin is presumed and added
    // Start point (eye) and view (direction) are put in the world binary
    const Eye = [-10.0, 2.1, -10.0];
    const Direction = [1/Math.SQRT2, 0, 1/Math.SQRT2]; // Normalisation is done at points but vector should have a length of 1
/*
    const sources = ["eventsblocksbase","eventsblocksblocks","events_green"]; // an extension of .obj is presumed

    // Destination file name
    const dest_filename = "eventblocksani"; // an extension of .bin is presumed and added
    // Start point (eye) and view (direction) are put in the world binary
    const Eye = [-10.0, 2.1, -10.0];
    const Direction = [1/Math.SQRT2, 0, 1/Math.SQRT2]; // Normalisation is done at points but vector should have a length of 1
*/
// Code is below here, don't alter for your world

/*******************************************************************************************/
//ENTRY POINT FOR THE WHOLE PROGRAMME
    // Activate .js modules
    const fs = require('fs');
    const cs = require('./blf/constants.js')
    const blf = require("./blf/support.js"); // Support functions
    const pr = require ("./blf/processes.js"); // Functions that process the obj array
    const tf = require ("./blf/tofile.js"); // Functions that put material into binary buffer

    var world_count = 0; // Count how many layers are in the world
    // Read the obj and mtl files for each world layer and make a .bon file
    console.log("Process all .obj files into .bon");
    sources.forEach (obj_to_bin);

    make_part(dest_filename); // Build and write the overarching header .hed file


          // Concatenate the .hed and .bon files into a joint .bin world binary
      console.log("\nConcatenating to make output file: "+ dest_filename +".bin");

      // ***** WORKING HERE TO FIND LENGTH OF EACH BON FILE SO THAT WE CAN INCLUDE THAT IN HED FILE

      // Read and then re-write the world header to a file
      // .hed file is named by destination as there is only one
      try {
        var hed_in = fs.readFileSync(dest_filename+".hed");
      } catch(err){
          console.log("There was a problem reading the header file");
          process.exit();
        }
      
      try {
        fs.writeFileSync(dest_filename + ".bin", hed_in, {encoding: null,});
        } catch(err){
          console.log("There was a problem writing the header file");
          process.exit();
        }
     
        sources.forEach(concat_bin);
 
          console.log("FINISHED")
          //////////// End of main
 
function concat_bin(obj_filename){
    console.log("Concatenating "+obj_filename);
      // Read and then re-write a world .bon to the .bin file
      // Check if it is a set of frames
      if (fs.existsSync(obj_filename+"0000.bon"))
        {
          console.log("The filename stem appears to name an animation");
          var frame_count = 0;
          // Loop through every one of the animation .bon files
          while (fs.existsSync(obj_filename+frame_count.toString(10).padStart(4,'0')+".bon"))
          {
            tf.concat_bon_file(obj_filename+frame_count.toString(10).padStart(4,'0'),dest_filename);
            frame_count++;   
          }
        } // End of multiple .bon if
      else { // No, it is a single .bon file
        tf.concat_bon_file(obj_filename,dest_filename);
          } // End of single .bon else
 }

 function obj_to_bin(obj_filename){

    console.log("\n***** Opening source of 3d world " + obj_filename);

    // See if the named file is actually the first of an animation set as indicated by
    // having '0000' at the end of filename, but before '.obj'

    if (fs.existsSync(obj_filename+"0000.obj"))
    {
      console.log("The filename stem appears to name an animation");
      var frame_count = 0;
      // Loop through every one of the animation .obj files
      while (fs.existsSync(obj_filename+frame_count.toString(10).padStart(4,'0')+".obj"))
      {
        console.log("Processing the object file for frame: "+ frame_count);

        var active_obj_filename = obj_filename +frame_count.toString(10).padStart(4,'0');

        frame_count++;
        convert_obj(active_obj_filename);
      }
      tf.bon_worlds.add_count(0x1e,world_count,frame_count); // Store record of the world AFTER the sizes
      console.log("\nAnimated binary world conversion is complete");
/*
      // Read a binary file into a buffer
      const read_in = fs.readFileSync(obj_filename+"0000.bin");
      // Slice (copy) its segment of the underlying ArrayBuffer
      // from https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer/31394257#31394257
      const read_dv = new DataView (read_in.buffer.slice(read_in.byteOffset, read_in.byteOffset + read_in.byteLength));
*/
    } // end of if for multiple obj version
    else // Do a non-animated world
    {
      convert_obj(obj_filename);
      tf.bon_worlds.add_count(0x1f,world_count,1); // Store record of the world AFTER the size

      console.log("\nSingle binary world conversion is complete");
    }
  world_count++; 
  } // End of obj_to_bin

// Take a pre-existing binary world file and place a partition header before it 
function make_part(filename)
{
  var part_head_buffer_size = 0;
  part_head_buffer_size += blf.pad_to_word(6 * cs.FLOAT_SIZE); // 2x Vec3f for eye and direction
  const bon_world_size = tf.bon_worlds.size();
  part_head_buffer_size += bon_world_size * cs.UINT32_SIZE; // Make enough space for the world offsets
  part_head_buffer_size += 1 * cs.UINT32_SIZE; // Leave space for a terminator

  var part_head_buffer = new ArrayBuffer (part_head_buffer_size);
  var part_head_dv = new DataView(part_head_buffer);

  var head_dv_index = 0; // To indicate where to place the sections in the single buffer


 // Now place the vertices and faces into the buffer for later writing
 // Offsets will be stored in the header as they are done to avoid risk of divergence

 console.log("Storing starting point and direction vectors");
 head_dv_index = tf.float_vec_to_bin(Eye,part_head_dv,head_dv_index);
 head_dv_index = tf.float_vec_to_bin(Direction,part_head_dv,head_dv_index);

// head_dv_index = tf.uint32_to_bin((head_dv_index + cs.UINT32_SIZE),part_head_dv,head_dv_index); // Make an offset to after this position

console.log (tf.bon_worlds.give(part_head_buffer_size)); // Show the outcome
  // Place the bon_worlds array into the buffer as 32 bit words
  tf.bon_worlds.give(part_head_buffer_size).forEach(member => {
    head_dv_index = tf.uint32_to_bin(member,part_head_dv,head_dv_index);
  });
  // Terminate with zero
  head_dv_index = tf.uint32_to_bin(0x00000000,part_head_dv,head_dv_index);

 console.log("Writing header file: "+ filename +".hed");
 // Write the world buffers to a file
 try {
   fs.writeFileSync(filename + ".hed", part_head_dv, {encoding: null,});
   } catch(err){
     console.log("There was a problem writing the header file");
     process.exit();
   }

} // End of make_part 

// Input a filename of an obj file and make a binary world file from it
function convert_obj(filename)
{
    // Set up the key objects, destination for processing and chunk for chunking
    var destination_obj = {
      data: [],           // This array will be read from OBJ file and used later
      face_lines: [],     // Used to be a simple count but may as well be the list of entries
      vertex_lines: [],
      texture_lines: [],
      face_mtl: [],            // An array of the materials applied to each face
    };                    // Objects are passed by reference and so alterable in a function
  
    var chunk_obj = { // A collection of information for allocating chunks
      elements_count: 0, // Keep a record of how many faces per chunk, array will grow to suit
      faces_allocated: [],
      chunk_array: [[]] // A 2D array to store chunk information as it is gathered
    };
 
    var mtl_sheet_obj = {
      data: [],            // Where MTL array is
      mat_names: [],         // Names of materials
      Ns: [],                 // The speculatr nature of the material
      KdR: [],               // Floating point RGB arrays
      KdG: [],
      KdB: [],
      TextureWidth: [],
      TextureHeight:[],
      TextureImage: []           // The filename of the texture map image
    };

    blf.read_obj(filename+".obj", destination_obj);
    
    // Not putting the header file opening stuff here
    console.log("Finding faces");
    // Find and record the lines where faces and then vertices are in the OBJ file
    destination_obj.face_lines = pr.find_lines('f',destination_obj); // .face_mtl will now have material names

    console.log("Finding vertices");
    destination_obj.vertex_lines = pr.find_lines('v',destination_obj);

    console.log("Finding vertex texture UV coordinates");
    destination_obj.texture_lines = pr.find_lines('vt',destination_obj);
 
    console.log("Converting materials\n");

    // Read the mtl file as per the OBJ file, if one is given
    const mtl_lines = pr.find_lines('mtllib',destination_obj);
   if (mtl_lines.length > 1) throw ("More than one MTL file is specified. Program has quit.");
   if (mtl_lines.length)
    {
    // There is a MTL file so process it, get the name and load the data
    var mtl_filename = destination_obj.data[mtl_lines[0]][1];
    blf.read_obj(mtl_filename,mtl_sheet_obj);

    // Pull out the new material definitions
    console.log("Finding materials in use");
    const new_mtl_lines = pr.find_lines('newmtl',mtl_sheet_obj);
    console.log("There are %d materials specified",new_mtl_lines.length);

    // Make an array of materials from the mtl file descriptions
    pr.get_mtl_names(new_mtl_lines,mtl_sheet_obj);
 
    // This buffer material is placed after the materials now so that it can include palette information
    // which isn't known until the mtl file is parsed

    console.log("Building output buffer\n");

    // Calculate size of each section based on the parsing of the obj file
    // floats and pointers are by definition 4 bytes, but uint16 should be adjusted 
    // by adding and masking so that next block always lies on a word boundary

    var whole_buffer_size = 0;
    // Start with a header, it is unwise to do this with a structure that might have unexpected
    // padding in js
//    whole_buffer_size += blf.pad_to_word(6 * cs.FLOAT_SIZE); // 2x Vec3f for eye and direction
    whole_buffer_size += blf.pad_to_word(7 * cs.PTR_SIZE); // the header has been reduced to 7 pointers as descriptors will be elsewhere
    const header_size = whole_buffer_size; // This is needed later and is the only size that isn't made by progressive placement of items

    whole_buffer_size += blf.pad_to_word(3 * cs.FLOAT_SIZE * (destination_obj.vertex_lines.length + 1)); // vertices of Vec3f
    whole_buffer_size += blf.pad_to_word(3 * cs.UINT16_SIZE * destination_obj.face_lines.length); // nverts index
    whole_buffer_size += blf.pad_to_word(2 * cs.FLOAT_SIZE * (destination_obj.texture_lines.length + 1)); // vts UV of Vec2f
    whole_buffer_size += blf.pad_to_word(3 * cs.UINT16_SIZE * destination_obj.face_lines.length); // texels index
    whole_buffer_size += blf.pad_to_word(cs.UINT16_SIZE * destination_obj.face_lines.length); //attribute indices
    whole_buffer_size += blf.pad_to_word(cs.UINT32_SIZE + new_mtl_lines.length * 3 * cs.UINT32_SIZE); // The size of the palette, followed by the palette
    
    console.log("Predicted buffer size is" + blf.numToHexString(whole_buffer_size));

    // A single buffer will be used for the world components and placed by index
    // By specifying a maximum size of the partition it can be shrunk or increased before writing
    var world_buffer = new ArrayBuffer (whole_buffer_size, { maxByteLength: cs.MAX_WORLD});
    var world_dv = new DataView(world_buffer);

    var world_dv_index; // To indicate where to place the sections in the single buffer
  
  
   // Now place the vertices and faces into the buffer for later writing
   // Offsets will be stored in the header as they are done to avoid risk of divergence
   var head_index=0;
/*
   console.log("Storing starting point and direction vectors");
   head_index = tf.float_vec_to_bin(Eye,world_dv,head_index);
   head_index = tf.float_vec_to_bin(Direction,world_dv,head_index);
   head_index = tf.uint32_to_bin((head_index + cs.UINT32_SIZE),world_dv,head_index); // Make an offset to after this position
*/
   world_dv_index = header_size; // verts go after the header

    console.log("Vertices Vec3f offset is" + blf.numToHexString(world_dv_index));
    world_dv.setUint32(head_index,world_dv_index,true); // vertices
    head_index += cs.PTR_SIZE; 
    world_dv_index = tf.vert_to_file(world_dv,world_dv_index,destination_obj.vertex_lines,destination_obj); // Pick the vertices and add to the output - starts 0x00000

    console.log("Nvertices Uint16 offset is" + blf.numToHexString(world_dv_index));
    world_dv.setUint32(head_index,world_dv_index,true); // nvertices
    head_index += cs.PTR_SIZE; 
    world_dv_index = tf.face_to_file(world_dv, world_dv_index,destination_obj.face_lines,destination_obj,0); // Process faces and add to output

    console.log("Vts Vec2f offset is"+ blf.numToHexString(world_dv_index));
    world_dv.setUint32(head_index,world_dv_index,true); // vts
    head_index += cs.PTR_SIZE; 
    world_dv_index = tf.vts_to_file(world_dv, world_dv_index, destination_obj.texture_lines,destination_obj); // Process vts uv and add to output

    console.log("Texel index Uint16 offset"+ blf.numToHexString(world_dv_index));
    world_dv.setUint32(head_index,world_dv_index,true); // texel indices
    head_index += cs.PTR_SIZE; 
    // Re-use the face_lines but pick after the slash this time
    world_dv_index = tf.face_to_file(world_dv, world_dv_index, destination_obj.face_lines,destination_obj,1); // Process faces and add to output

    
     // Ouput the attributes which are found from mtl data
    console.log("Attribute Uint16 offset is" + blf.numToHexString(world_dv_index));
    world_dv.setUint32(head_index,world_dv_index,true); // attributes
    head_index += cs.PTR_SIZE; 
    // Write an array of material attributes / indices into the palette
    var world_dv_index = tf.attribute_to_file(world_dv,world_dv_index,mtl_sheet_obj,destination_obj);

    // Ouput the palette and recored its offset
    console.log("Palette offset is" + blf.numToHexString(world_dv_index));
    world_dv.setUint32(head_index,world_dv_index,true); // attributes
    head_index += cs.PTR_SIZE; 
    // Write the palette which is indexed by attributes
    var world_dv_index = tf.palette_to_file(world_dv,world_dv_index,mtl_sheet_obj,destination_obj);

    console.log("Stored offset chunk maps" + blf.numToHexString(world_dv_index));
    world_dv.setUint32(head_index,world_dv_index,true); // chunk maps
    head_index += cs.PTR_SIZE;
     
if (world_dv_index < whole_buffer_size)
{
  console.log("Trimming buffer prior to considering chunks");
  world_buffer.resize(world_dv_index);
}
console.log("Total size of this world excluding chunks is" + blf.numToHexString(world_dv_index));

    console.log("Writing world file: "+ filename +".bon");
    // Write the world buffers to a file
    try {
      fs.writeFileSync(filename + ".bon", world_dv, {encoding: null,});
      } catch(err){
        console.log("There was a problem writing the world binary");
        process.exit();
      }
        
    } // End of IF that deals with presence of an MTL file

// Now lets see about chunks

console.log("Looking at chunks\n");

find_chunks(filename, destination_obj, destination_obj.face_lines, destination_obj.vertex_lines, chunk_obj); // Use the information so far to learn about the dimensions of the world

var file_size = tf.get_file_size(filename+".bon");
tf.bon_worlds.add_offset(file_size); // Save the size for later 

} // End of object file to binary conversion

/*************************************************************************************************/
// Chunk stuff follows
// Try to automagically spilt faces into chunks Jan 20th 2024
// Assumes that a face does NOT pass out of a chunk which is fine if it was built on a grid knowing this!
function find_chunks(filename, dest, face_lines, vertex_lines, chunk_obj)
{
  const chk = require("./blf/chunks.js"); // Import support functions
 
  var chunk_layout = { // Describes the chunk pattern in the world
    xmin: 0,
    zmin: 0,
    xmax: 0,
    zmax: 0,
    xchunks: 0,
    zchunks: 0,
    width: 0      
  };

  // Find the extent of the world and set chunk_layout accordingly
  chk.chunk_borders(dest, chunk_layout);

  // Test which faces are in a chunk and build the chunk array result
  // returning details in the chunk_obj
  chk.test_faces(chunk_layout, dest, chunk_obj);

  // At this point chunk_array[[]]  in chunk_obj contains all the information needed to build the binary
  // Allow space for 5x Uint16 constants that outline the world space, add a padding Uint16 to delineate 
  // Buffer size needs to be the size of chunk_element count plus entries of pointer and count for each chunk
  // Chunk face list are Uint16 but pointers have to be Uint32 

  // Calculate the size of the entire chunk buffer
  const chunk_header_size = cs.INT16_SIZE * 6; // 5 values plus 1 padding
  const chunk_table_size = 2 * cs.PTR_SIZE * chunk_obj.chunk_array.length; // 2 words for each chunk, even if empty
  
  const whole_chunk_buffer_size= chunk_header_size + chunk_table_size + cs.UINT16_SIZE * chunk_obj.element_count;
  console.log("Predicted chunk buffer size is" + blf.numToHexString(whole_chunk_buffer_size));

  // A single buffer will be used for the chunk components and placed / accessed by index
  var chunk_buffer = new ArrayBuffer (whole_chunk_buffer_size);
  var chunk_dv = new DataView(chunk_buffer);

  var chunk_dv_index = 0; // To indicate where to place the sections in the chunk buffer
  var chunk_offset = 0; // Indicates where to find the face array for each chunk in the binary stream

  // Place the 5 chunk parameters we need
  chunk_dv_index = tf.chunk_param_to_file(chunk_dv, chunk_dv_index,chunk_layout);
  
  // Offset for the face lists needs to be adjusted to pointer after chunk map
  chunk_offset = chunk_header_size + chunk_table_size;
  
  // Write the array into the dataview and update the index
  chunk_dv_index = chk.make_chunk_lists(chunk_obj, chunk_offset, chunk_dv_index, chunk_dv );
  
    console.log("Appending chunk map to bon file: "+ filename);
    // Write the world buffers to a file
    try {
      fs.appendFileSync(filename + ".bon", chunk_dv, {encoding: null,});
      } catch(err){
        console.log("There was a problem appending the chunk binary to world");
        process.exit();
      }
  
  // Check if the faces are fully allocated, this is for information only
  // Neither of these eventualities should happen now as 
  for (i = 0; i < dest.face_lines.length; i++) // Check that all faces allocated just the once
  {
    if (chunk_obj.faces_allocated[i]==0)
      {
        console.log("\nFace "+ i +" not allocated to a chunk");
        chk.show_face(dest, i);
      }
    if (chunk_obj.faces_allocated[i]>1)
      {
        console.log("\nFace "+ i +" allocated to more than one chunk");
        chk.show_face(dest, i);
      }
  }
} // end of find chunks

