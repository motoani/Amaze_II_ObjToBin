// Functions that process the obj array

// Find_lines takes the destination object and
// returns which lines match the query as an array
function find_lines(conditional,dest) {

    const data = dest.data; // locate our source array
    var found = []; // the lines where condition is matched will be put into this expanding array
    
    if (conditional == 'f') {
      var mtl_in_use=""; // This will/may be updated by usemtl 
      dest.face_mtl.length = 0; // Reset the temporary array
    }
    
    
    for(var i = 0; i < data.length; i++) {
      if (conditional == 'f') {
        if (data[i][0] == 'usemtl') mtl_in_use = data[i][1]; // If scanning for faces then see it material is being updated
      }
      if (data[i][0] == conditional) {
        found.push(i); // Add the index of this line onto the array
        if (conditional == 'f') dest.face_mtl.push(mtl_in_use); // Build array of material for use face
        } // end of matching the condition
      } // end of scan through data for-loop
    return (found);  
    } // end of find_lines

// Finds the offset of the next occurence of the conditional or return zero if not found
// typically used to find a component of a material in a newmtl definition
function find_line_offset(start_line,conditional,obj_to_search) {
    var data = obj_to_search.data;
    var found = false;
    var offset = 0;
  
    for (var search = start_line + 1 ; search < data.length; search++) { // Start looking at the line after the start
      if (data[search][0] == "newmtl") {
        found = false;
        break; // We reached the next material so there isn't a match in this block
      }
      if (data[search][0] == conditional) { 
        found = true;
        break; 
      }// end of matching the condition
    } // end of for loop that's hunting
  
  if (found) offset = search-start_line;
  return (offset);
  } // End of find_line_offset function
  
// Pull rows of new materials and also push Kd into an array in the mtl object
function get_mtl_names(line_array,mtl_obj) {

    const blf = require("./support.js"); // Support functions
    var data = mtl_obj.data;
  
    line_array.forEach(function(value) {
      // Read the newmtl text
  
      mtl_obj.mat_names.push( data[value][1] );  // Get the name and add to end of that array
  
      var Kd_offset = find_line_offset(value,'Kd',mtl_obj);
      if (Kd_offset) {
        // In the example file it's possible to find Kd as an offset of 3 but not very robust....
        mtl_obj.KdR.push( data[value+Kd_offset][1] );  // Make an array of RGB values
        mtl_obj.KdG.push( data[value+Kd_offset][2] );
        mtl_obj.KdB.push( data[value+Kd_offset][3] );
      } // End of IF for a Kd being found after a newmtl
      else {
        // Kd value isn't in textures but we must keep them in sync
        mtl_obj.KdR.push(0);
        mtl_obj.KdG.push(0);
        mtl_obj.KdB.push(0);
      }

      var Ns_offset = find_line_offset(value,'Ns',mtl_obj);
      if (Ns_offset) {
        // Include shininess
        mtl_obj.Ns.push( data[value+Ns_offset][1] );  // Make an array of RGB values
      } // End of IF for a Ks being found after a newmtl
      else {
        // Ns value isn't in textures but we must keep them in sync
        mtl_obj.Ns.push(0);
      }

      var texture_offset = find_line_offset(value,'map_Kd',mtl_obj);
      if (texture_offset) {
        // In the example file it's possible to find texture map as a fixed offset but not very robust....
        mtl_obj.TextureWidth.push('true'); // There is a texture , it can be found later from dib
        mtl_obj.TextureHeight.push('true');
        var TextureName = blf.makeImageName(data[value+texture_offset]); // fetch and parse the texture image file name
        mtl_obj.TextureImage.push( TextureName );  // Put the name into the array
      }
      else {
        mtl_obj.TextureWidth.push('0'); // No texture so default in width and height
        mtl_obj.TextureHeight.push('0');
        mtl_obj.TextureImage.push("dummy"); // there is no texture for this material
      } // End of IF for a texture image name being present
  
  
    }); // End of foreach callback and loop
  } // End of get_mtl_names
    
// Allow these to be used externally
module.exports = { find_lines, find_line_offset, get_mtl_names };
