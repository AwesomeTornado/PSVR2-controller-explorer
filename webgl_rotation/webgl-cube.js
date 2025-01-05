import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";

let gyroX = 0.0;
let gyroY = 0.0;
let gyroZ = 0.0;

let prevRotx = 0.0;
let prevRoty = 0.0;
let prevRotz = 0.0;

const VENDOR_ID_SONY = 0x054c;
const PRODUCT_ID_DUAL_SENSE = 0x0e46;

const USAGE_PAGE_GENERIC_DESKTOP = 0x0001;
const USAGE_ID_GD_GAME_PAD = 0x0005;

// Expected report sizes, not including the report ID byte.
const DUAL_SENSE_USB_INPUT_REPORT_0x01_SIZE = 63;
const DUAL_SENSE_BT_INPUT_REPORT_0x01_SIZE = 9;
const DUAL_SENSE_BT_INPUT_REPORT_0x31_SIZE = 77;

main();
async function main() {
    const canvas = document.querySelector("#glcanvas");
    // Initialize the GL context
    const gl = canvas.getContext("webgl");

    // Only continue if WebGL is available and working
    if (gl === null) {
        alert(
            "Unable to initialize WebGL. Your browser or machine may not support it."
        );
        return;
    }

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Vertex shader program
    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `;

    // Fragment shader program
    const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVertexColor and also
    // look up uniform locations.
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(
                shaderProgram,
                "uProjectionMatrix"
            ),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    const buffers = initBuffers(gl);

    let then = 0;

    // Draw the scene repeatedly
    function render(now) {
        
        //add gyro values to a position variable.
        //This allows for more absolute positioning
        //Divide by a very large number because gyro inputs are very large compared to radians.
        let scalar = 10000;
        prevRotx += gyroX / scalar;
        prevRoty += gyroY / scalar;
        prevRotz += gyroZ / scalar;

        drawScene(gl, programInfo, buffers, prevRotx, prevRoty, prevRotz);

        //Add some decay to the rotation values.
        //This prevents drift from becoming an issue, and recenters the cube.
        //Reduce decay value for more absolute visuals.
        let decay = 0.92;
        prevRotx *= decay;
        prevRoty *= decay;
        prevRotz *= decay;

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}



//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(
            `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram
            )}`
        );
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
        );
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

//webhid cannot be accessed without a user input, so we spawn a simple button here.
const button = document.querySelector('button');
button.addEventListener('click', async function () {
    //opens the hid selector prompt.
    //I should probably add a filter so only sony devices show up, but I can't be fucked to right now.
    const devices = await navigator.hid.requestDevice({ filters: [] });

    //is this needed? I don't know.
    let device = devices[0];

    //Make sure that the device is opened, simple failsafe.
    if (!device.opened) {
        await device.open();
        if (!device.opened) {
            console.log("Failed to open " + device.productName);
            return;
        }
    }

    //attach the input handler.
    device.addEventListener("inputreport", (event) => {
        handleBluetoothInputReport31(event.data);
    });

    console.log("Input report bound");
});

function handleBluetoothInputReport31(report) {
    //there is a chance that the user has plugged in their controller, or that input report 0x05 has not been read yet.
    //In either of these cases, this function will not work quite right, so we just exit.
    if (report.byteLength != DUAL_SENSE_BT_INPUT_REPORT_0x31_SIZE) {
        return;
    }

    let gyroX0 = report.getUint8(16);
    let gyroX1 = report.getUint8(17);
    let gyroY0 = report.getUint8(18);
    let gyroY1 = report.getUint8(19);
    let gyroZ0 = report.getUint8(20);
    let gyroZ1 = report.getUint8(21);
    let accelX0 = report.getUint8(22);
    let accelX1 = report.getUint8(23);
    let accelY0 = report.getUint8(24);
    let accelY1 = report.getUint8(25);
    let accelZ0 = report.getUint8(26);
    let accelZ1 = report.getUint8(27);

    //I don't know what this math does, or why it's here
    //but I copied it from another project, and it seems to work.
    let gyrox = (gyroX1 << 8) | gyroX0;
    if (gyrox > 0x7fff) gyrox -= 0x10000;
    let gyroy = (gyroY1 << 8) | gyroY0;
    if (gyroy > 0x7fff) gyroy -= 0x10000;
    let gyroz = (gyroZ1 << 8) | gyroZ0;
    if (gyroz > 0x7fff) gyroz -= 0x10000;
    let accelx = (accelX1 << 8) | accelX0;
    if (accelx > 0x7fff) accelx -= 0x10000;
    let accely = (accelY1 << 8) | accelY0;
    if (accely > 0x7fff) accely -= 0x10000;
    let accelz = (accelZ1 << 8) | accelZ0;
    if (accelz > 0x7fff) accelz -= 0x10000;

    //compute the weighted average of the gyro values.
    //without averaging, the gyro rotation is too shaky to render well.
    let smoothing = 0.98
    gyroX = gyrox * (1-smoothing) + gyroX * smoothing;
    gyroY = gyroy * (1-smoothing) + gyroY * smoothing;
    gyroZ = gyroz * (1-smoothing) + gyroZ * smoothing;
}
