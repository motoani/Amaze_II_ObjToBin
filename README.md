# ObjToBin

## motoani November 2024

This node.js script processes .obj and .mtl files of a 3D world into a .bin file suitable for rendering in [Amaze_II](https://github.com/motoani/Amaze_II).

The script is fairly well commented but it accumulated haphazardly so I am aware that various optimisations could be made. However as this is a tool that runs 'fast enough' I haven't bothered to do much refactoring.

## How to use

### Blender export

I have built worlds in Blender and then exported them to Wavefront format files .obj and .mtl. It is ESSENTIAL that the export flags to
- Triangulate Mesh is set
- Normals is not set
- UV Coordinates is set if textures are present in the materials

### Textures

If you have used textures in your world you have to collate these separately using a tool such as [HXD](https://mh-nexus.de/en/hxd/). There is information in textures.js on how to format images and a sample const array is presented.

It is essential that the name in the array matches the texture name in the .mtl file so that the script can attach the appopriate offset. This implies that you can edit either manually, should this be required.

### Running the script

For best use, a base layer of the ground should be exported as obj/mtl, other features as another obj/mtl pair and any animations as a final set. 

In app.js there is a const array for input files and a const for the output. Note that the first input file is assumed by the script and Amaze_II to be the base layer.

Run app.js in whatever system you have for node.js. I use the native support in VS Code. A world with many thousands of triangles across hundreds of chunks will take a few minutes to build. Text output will appear in the monitor to indicate action until FINISHED is displayed.

Some residual .bon and .hed files should be deleted, I've been reluctant to include unlink() in my script to avoid loss of desired files!

There is a demonstration of the script's use on [YouTube](https://youtu.be/cqhp0LJD6R0).