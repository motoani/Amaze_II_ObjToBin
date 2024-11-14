// Functions to support the chunk maker
const cs = require('./constants.js')
const sup = require('./support.js'); // Support functions
 

// Input a list of lines that contain vertices in the data source 
// use the x and z values to find minima and maxima.  
// A mutable chunk structure is passed in and updated
function chunk_borders (dest_obj, chunk_obj) {
  // very large and very small numbers so that the coordinates will fall within the range
  var xmin = Number.MAX_VALUE;
  var xmax = -Number.MAX_VALUE; // Note that MIN_VALUE cannot be used as that is the smallest positive number
  var zmin = Number.MAX_VALUE;
  var zmax = -Number.MAX_VALUE;

  var vert_x; // temporary values
  var vert_z;

  // Find the maximum size of our world by scanning all vertices regardless of arrangement into faces
  dest_obj.vertex_lines.forEach(function(value) {

    vert_x=parseFloat(dest_obj.data[value][1]); // Retrieve the lines with vertices and get real numbers from text
    vert_z=parseFloat(dest_obj.data[value][3]);

    if (vert_x < xmin) xmin = vert_x;
    if (vert_x > xmax) xmax = vert_x;
    if (vert_z < zmin) zmin = vert_z; // The Z dimension is the distance away
    if (vert_z > zmax) zmax = vert_z;
  
  }); // End of foreach callback and loop

// Now we know size of the world so round bounding box to enclosing chunk_size

    chunk_obj.xmin = Math.floor(xmin / cs.CH_SIZE) * cs.CH_SIZE;
    chunk_obj.zmin = Math.floor(zmin / cs.CH_SIZE) * cs.CH_SIZE;

    chunk_obj.xmax = Math.ceil(xmax / cs.CH_SIZE) * cs.CH_SIZE;
    chunk_obj.zmax = Math.ceil(zmax / cs.CH_SIZE) * cs.CH_SIZE;

    chunk_obj.xchunks = Math.abs(chunk_obj.xmax - chunk_obj.xmin)/cs.CH_SIZE; 
    chunk_obj.zchunks = Math.abs(chunk_obj.zmax - chunk_obj.zmin)/cs.CH_SIZE; 

    chunk_obj.width = cs.CH_SIZE;

} // end of chunk_borders

// Input the array of chunks and offsets to place in the dataview buffer
function make_chunk_lists(chunk_obj, chunk_offset, dv_index, chDataview ) {

  chunk_obj.chunk_array.forEach(function(facelist) {
    // find length of each element in array which gives face count and can be used to calculate the offset
    if (facelist.length == 0 )
      {
        chDataview.setUint32(dv_index,0xffffffff,true); dv_index += cs.PTR_SIZE; // Dummy offset value
      }
    else
      {
        // Calculate offset based on counts
        chDataview.setUint32(dv_index,chunk_offset,true); dv_index += cs.PTR_SIZE; // This is the offset value 
        var this_offset = chunk_offset;
        // Put the list of faces into the buffer at the offset
        facelist.forEach(function(face) {
            chDataview.setUint16(this_offset,face,true); this_offset += cs.UINT16_SIZE // Put in the list of faces for that chunk
          }); // End of face for each callback and loop
      }
    chunk_offset += facelist.length * cs.UINT16_SIZE; // the offset for the next value is how far placed after this chunk
    chDataview.setUint32(dv_index,facelist.length,true); dv_index += cs.PTR_SIZE; // This is the face count for this chunk
    }); // End of facelist foreach callback and loop

return (dv_index);
} // end of make_chunk_lists

// Input the data source and assess every face against the chunk layout
function test_faces(chunk_layout, dest_obj, chunk_obj) {
  
    var faces_per_chunk = []; // Keep a record of how many faces per chunk, array will grow to suit
    var chunk_index=0;
    chunk_obj.element_count = 0;

  // Set the chunk allocation count to zero for every known face as
  // an unallocated entry is NaN so can't be incremented, nor
  // can an unsized array be cleared on creation
  var face_idx=0;
  dest_obj.face_lines.forEach(function(value) {
    chunk_obj.faces_allocated[face_idx++] = 0;
    });

  // Loop through every chunk
  for (var zchunk = chunk_layout.zmin; zchunk < chunk_layout.zmax; zchunk += chunk_layout.width)
  {
    for (var xchunk = chunk_layout.xmin; xchunk < chunk_layout.xmax; xchunk += chunk_layout.width)
    {
      //console.log("*** Chunk "+ chunk_index); // Cursor up?
      var found = []; // An array where faces will be pushed as they are allocated to a chunk, reset for each chunk

      // Check every face in every chunk which is very tedious!
      var face_idx=0;
      dest_obj.face_lines.forEach(function(value) {
        // Retrieve the indices of vertices for the face on this line of the array
        // adjust index by -1 as OBJ format starts at '1'
        var vert_index=[];
        // Each of these points to an xyz vertex line
        vert_index[0] = parseInt(dest_obj.data[value][1].split('/')[0])-1;
        vert_index[1] = parseInt(dest_obj.data[value][2].split('/')[0])-1;
        vert_index[2] = parseInt(dest_obj.data[value][3].split('/')[0])-1;

        var inside = true; // A boolean to see if the face's vertices are within this chunk
        // An error margin is included as Blender doesn't appear to be exact when making/exporting meshes
        // probably due to errors in floating point representation

        var temp_vertex = new sup.Vec3f();
        var temp_centre = new sup.Vec3f(0.0, 0.0, 0.0);

        for (this_vert=0;this_vert<3;this_vert++) {

          temp_vertex = fetch_vertex(dest_obj, vert_index, this_vert);

          temp_centre = temp_centre.add(temp_vertex);

          // Check x and z within the chunk boundaries by setting flag to false if vertex doesn't fit
          // It is possible for rounding errors, or weak geomtery, to place a triangle in none or two chunks
          if (!(temp_vertex.x >= (xchunk-cs.CH_ERROR_MARGIN) && temp_vertex.x <= (xchunk+cs.CH_SIZE+cs.CH_ERROR_MARGIN) && temp_vertex.z >= (zchunk-cs.CH_ERROR_MARGIN) && temp_vertex.z <= (zchunk+cs.CH_SIZE+cs.CH_ERROR_MARGIN))) inside = false;
        } // End of this_vert loop

        temp_centre = temp_centre.divby3(); // Derive centroid

        // A face won't be allocated a second time
        if (inside && chunk_obj.faces_allocated[face_idx]==0) // All three vertices are inside the chunk
        {
          chunk_obj.faces_allocated[face_idx]++; // Keep track of allocations
          found.push(face_idx); // Push the found face into an array
        } 
        else // The vertices aren't contained so perhaps the centroid is
        {
          if (temp_centre.x >= (xchunk-cs.CH_ERROR_MARGIN) && temp_centre.x <= (xchunk+cs.CH_SIZE+cs.CH_ERROR_MARGIN) && temp_centre.z >= (zchunk-cs.CH_ERROR_MARGIN) && temp_centre.z <= (zchunk+cs.CH_SIZE+cs.CH_ERROR_MARGIN)  && chunk_obj.faces_allocated[face_idx]==0)
          {
            chunk_obj.faces_allocated[face_idx]++; // Keep track of allocations
            found.push(face_idx); // Push the found face into an array  
          }
        }
        face_idx++; // Keep track of the faces                 
      }); // End of foreach face line

      faces_per_chunk.push(found.length);

      chunk_obj.chunk_array[chunk_index]=found; // store the face list / array of a chunk
      chunk_obj.element_count += found.length;

      chunk_index++;
    } // End of x loop  
  } // End of z loop
} // end of test_faces

function show_face(dest_obj, index)
{
  value = dest_obj.face_lines[index];

  // Retrieve the indices of vertices for the face on this line of the array
  // adjust index by -1 as OBJ format starts at '1'
    var vert_index=[];
    // Each of these points to an xyz vertex line
    vert_index[0] = parseInt(dest_obj.data[value][1].split('/')[0])-1;
    vert_index[1] = parseInt(dest_obj.data[value][2].split('/')[0])-1;
    vert_index[2] = parseInt(dest_obj.data[value][3].split('/')[0])-1;

    var temp_vertex = new sup.Vec3f();
    var temp_centre = new sup.Vec3f(0.0, 0.0, 0.0);

    for (this_vert=0;this_vert<3;this_vert++) {

      temp_vertex = fetch_vertex(dest_obj, vert_index, this_vert);

      temp_centre = temp_centre.add(temp_vertex);

      console.log("   at %f %f %f",temp_vertex.x, temp_vertex.y,temp_vertex.z);
    }
    temp_centre = temp_centre.divby3(); // Derive centroid
    console.log("   Centred on %f %f %f",temp_centre.x, temp_centre.y,temp_centre.z);
} // end of show_face

// Used in this module to fetch a Vertex vector from the desination object structure one vertex at a time
// It is not exported
function fetch_vertex(dest_obj, vert_index, this_vert)
{
  var found_vertex = new sup.Vec3f;

      // Use the face indices to fetch the 3 vertices of a face
      // We don't need 'y' for basic chunking but fetch it in case function is reused
      // toFixed has been included to adjust precisely aligned vertices and ERROR
      // can be tested later
      // 2 decimal places is equivalent to one centimetre
      found_vertex.x = Number(parseFloat(dest_obj.data[dest_obj.vertex_lines[vert_index[this_vert]]][1].split('/')[0]).toFixed(2));
      found_vertex.y = Number(parseFloat(dest_obj.data[dest_obj.vertex_lines[vert_index[this_vert]]][2].split('/')[0]).toFixed(2));
      found_vertex.z = Number(parseFloat(dest_obj.data[dest_obj.vertex_lines[vert_index[this_vert]]][3].split('/')[0]).toFixed(2));

  return found_vertex
} // end of fetch_vertex

/*
Some C++ functions from ESP32 code

// Check if the chunk is in range of the model and return false if not in the defined model
bool test_chunk(Vec2i chunk, const ChunkArr& chunk_param)
{
	if (chunk.x < 0 || chunk.x>(chunk_param.xcount - 1)) return false; // range check x
	if (chunk.y < 0 || chunk.y>(chunk_param.zcount - 1)) return false; // range check z

	return (true);
}

// Calculate chunk coordinate from eye position
// this is separated from test so scanning can occur from invalid chunks
// also passing the chunk parameters so can swap world layouts
Vec2i find_chunk(const Vec3f location, const ChunkArr& chunk_param)
{
	Vec2i this_chunk;

	this_chunk.x = (int)floor((location.x - chunk_param.xmin) / chunk_param.size);

	// Don't forget that z is the other axis in the horizontal world plane
	this_chunk.y = (int)floor((location.z - chunk_param.zmin) / chunk_param.size);

	return (this_chunk);
}

// Return the chunk's index in the model's array from coordinates of chunk
uint32_t chunk_index(const Vec2i chunk, const ChunkArr& chunk_param)
{
	return (chunk.x + chunk_param.xcount * chunk.y);
}

*/

// Allow these to be used externally
module.exports = { chunk_borders , make_chunk_lists , test_faces, show_face };