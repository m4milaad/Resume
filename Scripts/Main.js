
// Get the canvas element
const Canvas = document.getElementById("Canvas3D");

// Initialize the WebGL2 context
const WebGL = Canvas.getContext("webgl2");

if (!WebGL)
{
    alert("WebGL2 is not available.");
}

// Vertex shader source code
const VertexSource = `#version 300 es

in vec4 VertexPosition;
in vec2 InTextureCoord;
in vec3 InNormalVector;
in vec4 InSurfaceColor;

out vec3 SurfaceToCameraVector;
out vec2 TextureCoord;
out vec3 NormalVector;
out vec4 PositionFromLight;
out vec4 SurfaceColor;

uniform mat4 VertexTransformationMatrix;
uniform mat4 NormalTransformationMatrix;
uniform mat4 LightSpaceMatrix;
uniform mat4 ModelMatrix;

void main(void)
{
    gl_Position = VertexTransformationMatrix * VertexPosition;
    SurfaceToCameraVector = -normalize(VertexPosition * ModelMatrix).xyz;
    TextureCoord = InTextureCoord;
    NormalVector = mat3(NormalTransformationMatrix) * InNormalVector;
    PositionFromLight = LightSpaceMatrix * VertexPosition;
    SurfaceColor = InSurfaceColor;
}`;

// Fragment shader source code
const FragmentSource = `#version 300 es

precision highp float;

in vec3 SurfaceToCameraVector;
in vec2 TextureCoord;
in vec3 NormalVector;
in vec4 PositionFromLight;
in vec4 SurfaceColor;

out vec4 OutputColor;

uniform sampler2D ShadowMap;
uniform sampler2D TextTexture;
uniform float Time;

const vec3 LightColor = vec3(0.52, 0.36, 0.2); // Orange
//const vec3 LightColor = vec3(0.2, 0.53, 0.2); // Green
const vec3 SurfaceToLightVector = normalize(vec3(0.0, 5.0, 1.0));

float CalculateShadow(vec4 FragPosLightSpace, sampler2D ShadowMap)
{
    // Perform perspective divide
    vec3 ProjedtedCoords = FragPosLightSpace.xyz / FragPosLightSpace.w;
    
    // Transform to [0,1] range
    ProjedtedCoords = ProjedtedCoords * 0.5 + 0.5;
    
    // Get depth of current fragment from light's perspective
    float CurrentDepth = ProjedtedCoords.z;

    // Calculate bias based on depth map texel size
    vec2 TexelSize = 1.0 / vec2(textureSize(ShadowMap, 0));

    // Variable for shadow intensity
    float ShadowIntensity = 0.0;
    
    // Percentage Closer Filtering (PCF)
    for(int x = -1; x <= 1; x++)
    {
        for(int y = -1; y <= 1; y++)
        {
            float pcfDepth = texture(ShadowMap, ProjedtedCoords.xy + vec2(x, y) * TexelSize).r;
            ShadowIntensity += CurrentDepth - 0.02 > pcfDepth ? 1.0 : 0.0; // Bias is 0.02
        }
    }

    ShadowIntensity /= 9.0;
    
    // Prevent shadow outside of far plane
    if(ProjedtedCoords.z > 1.0) {ShadowIntensity = 1.0;}

    return ShadowIntensity;
}

float Random(vec2 Seed)
{
    return fract(sin(dot((Seed * (mod(Time, 1.0) + 1.0)), vec2(11.9898, 78.233))) * 43758.5453);
}

vec2 CurvedSurface(vec2 Coords, float Radius)
{
    return Radius * Coords / sqrt(Radius * Radius - dot(Coords, Coords));
}

vec3 CompressColor(vec3 Color, float Amount)
{
    // Calculate the average of the color components
    float Average = (Color.r + Color.g + Color.b) / 3.0;
    
    // Interpolate between the original color and the average (white point)
    return mix(Color, vec3(Average), Amount);
}

vec4 ScreenShader(float LightIntesity, float SpecularIntensity)
{
    // Get UV coords in range 1 to 0
    vec2 CoordsUV = vec2((TextureCoord.y - 0.522500) / 0.205000, (TextureCoord.x - 0.402778) / 0.194444);
    // Note for self max and min or each axis X:(0.402778, 0.597222), Y:(0.522500, 0.727500)

    // Small reapeting scanlines effect
    float ScanLines = mod(CoordsUV.y, 0.01) / 0.01;
    ScanLines = min(abs((ScanLines - 0.2) / 0.2), 1.0) * 0.5;

    // Noise in background
    float Noise = 0.1 * (Random(CoordsUV) - 0.5);

    // Large scane line effect
    float ScanPosition = 1.0 - mod(Time / 5.0, 2.0);
    float DistToScan = 1.0 - (CoordsUV.y - ScanPosition) * 4.0;
    vec3 ScreenScan = (DistToScan > 0.0 && DistToScan < 1.0) ? CompressColor(LightColor, 0.5) * 0.075 * DistToScan : vec3(0.0);

    // Backlighting from screen
    float Backlighting = max(0.0, 2.0 - length((CoordsUV * 2.0 - 1.0) / 0.5));
    
    // Apply scan line effect + lighting specular and diffuse + back lighting from screen
    vec3 FinalColor = (SpecularIntensity + Noise + ScreenScan) + (LightIntesity * ScanLines * Backlighting * LightColor);

    // Render text /////////////////////////////////////////////////////////////////////////////////////////////////////////

    float BorderSize = 0.075;

    // If inside region where text is rendered
    if (max(abs(CoordsUV - 0.5).x, abs(CoordsUV - 0.5).y) + BorderSize < 0.5)
    {
        // Coords to sample text texture at
        vec2 TextCoords = 1.0 - (CoordsUV - BorderSize) / (1.0 - BorderSize * 2.0);

        // Base color from text texture
        vec3 TextColor = texture(TextTexture, TextCoords).rgb;
        
        // Glow effect using mipmaps
        vec3 Glow = (textureLod(TextTexture, TextCoords, 3.0).rgb + textureLod(TextTexture, TextCoords, 4.0).rgb + textureLod(TextTexture, TextCoords, 5.0).rgb) * 0.5;
        
        // Combine base color and glow
        FinalColor += (TextColor + Glow) * min(1.0, ScanLines + 0.65);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Calculate ambient occlusion (dark region at edge of screen)
    vec2 CurvedUV = CurvedSurface((CoordsUV * 2.0 - 1.0) * 1.28, 5.0) / 2.0;
    float ScreenSDF = 0.15 + (length(max(abs(CurvedUV) - vec2(0.5), 0.0)) - 0.1) * 10.0;
    float AmbientOcclusion = min(1.0, smoothstep(1.0, 0.0, ScreenSDF));

    return vec4(FinalColor * AmbientOcclusion, 1.0);
}

void main(void)
{
    // Calculate diffuse directional lighting and set ambient lighting
    float AmbientLightIntensity = 0.175;//0.25;
    float DirectionalLightIntensity = (dot(NormalVector, SurfaceToLightVector) + 1.0) * 0.5 * 0.575;//0.75;

    // Calculate shadows
    float ShadowIntensity = CalculateShadow(PositionFromLight, ShadowMap);

    // Calculate specular component of lighting
    vec3 HalfVector = normalize(SurfaceToCameraVector + SurfaceToLightVector);
    float Specular = pow(max(0.0, dot(NormalVector, HalfVector)), 2.0);
    Specular = mix(Specular, 0.0, ShadowIntensity); // Apply shadows to specular

    // Check if pixel is inside the screen
    if (SurfaceColor.g < 0.1 && SurfaceColor.r > 0.9)
    {
        // Render the screen
        OutputColor = ScreenShader(AmbientLightIntensity + DirectionalLightIntensity, Specular);
    }

    // Is pixel is not on the screen
    else
    {
        // Base lighting on surface ////////////////////////////////////////////////////////////////////////////////////////

        // Apply lighting to surface based on its color
        vec4 AmbientLighting = SurfaceColor * AmbientLightIntensity;
        vec4 DirectionalLighting = SurfaceColor * DirectionalLightIntensity;

        // Apply shadows to directional lighting
        DirectionalLighting = mix(DirectionalLighting, DirectionalLighting * 0.5, ShadowIntensity);

        // Sum all lights contributions to final color
        OutputColor = AmbientLighting + DirectionalLighting + Specular * clamp(SurfaceColor.r, 0.5, 0.75);

        // Screen glow onto the monitor ////////////////////////////////////////////////////////////////////////////////////

        // Get distance from the screen
        vec2 Centered = TextureCoord - vec2(0.5, 0.625);
        vec2 Offsets = abs(Centered) - vec2(0.097222, 0.1025);
        float Distance = length(max(Offsets, 0.0));

        // Scale distance and inverse it for light fall of
        float Intensisty = 1.0 - min(Distance / 0.001, 1.0);

        if (Intensisty > 0.0 && PositionFromLight.y > -0.457)
        {
            float BlurIterations = 150.0;
            float BlurSize = 0.3;

            vec2 CoordsUVBase = 1.0 - (TextureCoord.yx - vec2(0.5225, 0.402778)) / vec2(0.205, 0.194444);
            vec4 ScreenLightIntensisty = vec4(0.0);

            for(float i = 0.0; i < BlurIterations; i++)
            {
                // Calculate randomly offset sampling coords
                vec2 RandomOffset = vec2(Random(CoordsUVBase + i), Random(CoordsUVBase.yx + i + 1.0)) - 0.5;
                vec2 CoordsUVRandom = clamp(CoordsUVBase + RandomOffset * BlurSize, 0.0, 1.0);

                // Sample screen texture and add sample to the overall lighting
                vec4 SampledColor = textureLod(TextTexture, CoordsUVRandom, 5.0) / BlurIterations;
                ScreenLightIntensisty += (1.0 - OutputColor) * SampledColor;
            }

            // Add the screen glow to the final color
            OutputColor += ScreenLightIntensisty * Intensisty * 10.0;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    }

    OutputColor = vec4(clamp(OutputColor.rgb, 0.0, 1.0), 1.0);
}`;

// Load vertex and fragment shaders
const VertexShader = LoadShader(WebGL, WebGL.VERTEX_SHADER, VertexSource);
const FragmentShader = LoadShader(WebGL, WebGL.FRAGMENT_SHADER, FragmentSource);

// Create the shader program
const ShaderProgram = WebGL.createProgram();
WebGL.attachShader(ShaderProgram, VertexShader);
WebGL.attachShader(ShaderProgram, FragmentShader);
WebGL.linkProgram(ShaderProgram);

if (!WebGL.getProgramParameter(ShaderProgram, WebGL.LINK_STATUS))
{
    alert("Unable to initialize the shader program: " + WebGL.getProgramInfoLog(ShaderProgram));
}

// Collect shader attributes and uniform locations
const ProgramInfo = {
    AttribLocations:
    {
        VertexPosition: WebGL.getAttribLocation(ShaderProgram, "VertexPosition"),
        TextureCoord: WebGL.getAttribLocation(ShaderProgram, "InTextureCoord"),
        NormalVector: WebGL.getAttribLocation(ShaderProgram, "InNormalVector"),
        SurfaceColor: WebGL.getAttribLocation(ShaderProgram, "InSurfaceColor"),
    },

    UniformLocations: 
    {
        VertexTransformationMatrix: WebGL.getUniformLocation(ShaderProgram, "VertexTransformationMatrix"),
        NormalTransformationMatrix: WebGL.getUniformLocation(ShaderProgram, "NormalTransformationMatrix"),
        LightSpaceMatrix: WebGL.getUniformLocation(ShaderProgram, "LightSpaceMatrix"),
        ModelMatrix: WebGL.getUniformLocation(ShaderProgram, "ModelMatrix"),
        ShadowMap: WebGL.getUniformLocation(ShaderProgram, "ShadowMap"),
        TextTexture: WebGL.getUniformLocation(ShaderProgram, "TextTexture"),
        Time: WebGL.getUniformLocation(ShaderProgram, "Time"),
    },
};

// Vertex positions for the object
const [Positions, TextureCoords, Normals, Colors] = LoadObject(ObjectFile, MaterialFile);
const TriangleCount = Positions.length / 3;

// Create a buffer for the triangles positions
const PositionBuffer = WebGL.createBuffer();
WebGL.bindBuffer(WebGL.ARRAY_BUFFER, PositionBuffer);
WebGL.bufferData(WebGL.ARRAY_BUFFER, new Float32Array(Positions), WebGL.STATIC_DRAW);

// Create a buffer for the texture coords
const TextureCoordBuffer = WebGL.createBuffer();
WebGL.bindBuffer(WebGL.ARRAY_BUFFER, TextureCoordBuffer);
WebGL.bufferData(WebGL.ARRAY_BUFFER, new Float32Array(TextureCoords), WebGL.STATIC_DRAW);

// Create a buffer for the normal vectors
const NormalVectorBuffer = WebGL.createBuffer();
WebGL.bindBuffer(WebGL.ARRAY_BUFFER, NormalVectorBuffer);
WebGL.bufferData(WebGL.ARRAY_BUFFER, new Float32Array(Normals), WebGL.STATIC_DRAW);

// Create a buffer for the material color
const ColorBuffer = WebGL.createBuffer();
WebGL.bindBuffer(WebGL.ARRAY_BUFFER, ColorBuffer);
WebGL.bufferData(WebGL.ARRAY_BUFFER, new Float32Array(Colors), WebGL.STATIC_DRAW);

// Enable depth testing and face culling
WebGL.enable(WebGL.DEPTH_TEST);
WebGL.enable(WebGL.CULL_FACE);

// Shadow map stuffs // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// Model matrix for model transformations
let ModelMatrix = MatrixFunctions.Orthographic(-1, 1, -1, 1, -1, 1);
ModelMatrix = MatrixFunctions.RotateY(ModelMatrix, -1.571);
ModelMatrix = MatrixFunctions.Scale(ModelMatrix, 0.5, 0.5, 0.5);

// Light space matrix for dirctional light
const LightSpaceMatrix = MatrixFunctions.Multiply(MatrixFunctions.LookAt([0, -5, -1], [0, 0, 0], [0, 1, 0]), ModelMatrix);

// Create shadow map
const ShadowMap = GenerateShadowMap(2048, 2048, LightSpaceMatrix)

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// Set frame buffer and viewport for main camera rendering
WebGL.bindFramebuffer(WebGL.FRAMEBUFFER, null);
WebGL.viewport(0, 0, WebGL.canvas.width, WebGL.canvas.height);

// Tell WebGL to use our program for drawing to main camera
WebGL.useProgram(ShaderProgram);

// Text rendering stuffs // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// Create an offscreen canvas
const TextCanvas = document.createElement("canvas");
const Context = TextCanvas.getContext("2d");

// Set canvas size (adjust as needed)
TextCanvas.width = TextCanvas.height = 1024;

// Create texture
const TextTexture = WebGL.createTexture();

function UpdateTextTexture(NewText)
{
    // Render text on the canvas
    Context.clearRect(0, 0, TextCanvas.width, TextCanvas.height);
    Context.font = "32px monospace";//"32px VT323, monospace";
    Context.fillStyle = "rgb(255, 150, 50)"; // Orange
    //Context.fillStyle = "rgb(125, 255, 50)"; // Green
    
    const Lines = NewText.split("\n");
    Lines.forEach((Line, i) => {
        Context.fillText(Line, 32, 64 + i * 32);
    });

    // Update texture from canvas
    WebGL.bindTexture(WebGL.TEXTURE_2D, TextTexture);
    WebGL.texImage2D(WebGL.TEXTURE_2D, 0, WebGL.RGBA, WebGL.RGBA, WebGL.UNSIGNED_BYTE, TextCanvas);
    WebGL.texParameteri(WebGL.TEXTURE_2D, WebGL.TEXTURE_MIN_FILTER, WebGL.LINEAR_MIPMAP_LINEAR);
    WebGL.texParameteri(WebGL.TEXTURE_2D, WebGL.TEXTURE_MAG_FILTER, WebGL.LINEAR);
    WebGL.generateMipmap(WebGL.TEXTURE_2D);
}

// 30 lines max each line 55 chars long max

// Mouse input handling // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

let MouseOffset = [0, 0];
let MousePosition = [0, 0];

// Event listener for mouse movements
Canvas.addEventListener("mousemove", (event) => {
    MousePosition = [event.clientX, event.clientY];
    event.preventDefault();
});

let MouseDown = false;

// Check if left mouse button down
Canvas.addEventListener("mousedown", (event) => {
    if(event.button === 0)
    {
        MouseDown = true;
        MouseOffset = MousePosition;
    }

    event.preventDefault();
});

// Check if left mouse button up
Canvas.addEventListener("mouseup", (event) => {
    if(event.button === 0)
    {
        MouseDown = false;
    }

    event.preventDefault();
});

// Prevent right click context menu appearing
//Canvas.addEventListener("contextmenu", (event) => {
//    event.preventDefault();
//});

let Rotation = [0, 0];

// Keyboard input hanling // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// Object to store currrent key state
let CurrentlyPressedKey = null;

// Event listener for keydown
Canvas.addEventListener("keydown", (event) => {
    if (!["Enter", CurrentlyPressedKey].includes(event.key))
    {
        KeyboardPressed.play();
        KeyboardPressed.currentTime = 0;
    }

    CurrentlyPressedKey = event.key;
    KeyPressed(event.key);
    event.preventDefault();
});

// Event listener for keyup
Canvas.addEventListener("keyup", (event) => {
    CurrentlyPressedKey = null;
    event.preventDefault();
});

// Audio stuff // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// Load all sounds
const ComputerBoot = document.getElementById("ComputerBoot");
const ComputerAmbient = document.getElementById("ComputerAmbient");
const ComputerBeep = document.getElementById("ComputerBeep");
const KeyboardPressed = document.getElementById("KeyboardPressed");

ComputerBoot.volume = 0;
ComputerAmbient.volume = 0;

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// Add tabindex to make canvas focusable
Canvas.tabIndex = 1;

let Time = 0;
let LastTime = 0;

// Draw the scene
function UpdateScene(CurrentTime)
{
    // Check if this is first render
    if (Time == 0)
    {
        // Play boot and ambient sounds
        ComputerBoot.play();
        ComputerAmbient.play();

        // Make ambient sound repeat
        ComputerAmbient.loop = true;

        // Reset time
        LastTime = CurrentTime * 0.001 - 0.01;
    }

    // Time keeping // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

    CurrentTime *= 0.001; // Convert time to seconds
    const DeltaTime = CurrentTime - LastTime; // Get time since last update
    LastTime = CurrentTime; // Update last time variable
    Time += DeltaTime; // Time accumulator for fixed time step

    // Update the rotation of the camera // // // // // // // // // // // // // // // // // // // // // // // // // //

    // Update the text on the screen
    UpdateTextTexture(GetText());

    // Resize the canvas if necessary
    ResizeCanvasToDisplaySize(WebGL.canvas)

    if (MouseDown)
    {
        // Update rotation over time
        Rotation[0] += 0.1 * ((MousePosition[1] - MouseOffset[1]) / (WebGL.canvas.clientHeight * 2) - Rotation[0]);
        Rotation[1] += 0.1 * ((MousePosition[0] - MouseOffset[0]) / (WebGL.canvas.clientWidth * 2) - Rotation[1]);
    }

    else
    {
        // Decay rotation over time
        Rotation[0] *= 0.95;
        Rotation[1] *= 0.95;
    }

    // General matricies // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

    // Compute matrix for camera
    let CameraMatrix = MatrixFunctions.Base();
    CameraMatrix = MatrixFunctions.RotateX(CameraMatrix, -Rotation[0]);
    CameraMatrix = MatrixFunctions.RotateY(CameraMatrix, -Rotation[1]);

    // Compute the projection and view matricies
    let ProjectionMatrix = MatrixFunctions.Perspective(0.5, WebGL.canvas.clientWidth / WebGL.canvas.clientHeight, 1, 20000);
    let ViewMatrix = MatrixFunctions.Inverse(CameraMatrix);

    // Compute view matrix for all objects by combining camera and perspective matricies
    let ViewProjectionMatrix = MatrixFunctions.Multiply(ProjectionMatrix, ViewMatrix);

    // Object specific matricies // // // // // // // // // // // // // // // // // // // // // // // // // // // //

    // Compute the world transformations for this object
    let ModelMatrix = MatrixFunctions.Base();
    ModelMatrix = MatrixFunctions.Translate(ModelMatrix, 0, 0, -1.25);
    ModelMatrix = MatrixFunctions.RotateY(ModelMatrix, -1.571);
    ModelMatrix = MatrixFunctions.Scale(ModelMatrix, 0.5, 0.5, 0.5);

    // Compute full transformation matrix for this object
    let ModelViewProjectionMatrix = MatrixFunctions.Multiply(ViewProjectionMatrix, ModelMatrix);

    // Calculate normal matrix for this object
    let NormalMatrix = MatrixFunctions.Base();
    NormalMatrix = MatrixFunctions.RotateY(NormalMatrix, -1.571);

    // Rendering // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

    // Clear the canvas
    WebGL.clearColor(0.1, 0.1, 0.1, 1.0);
    WebGL.clear(WebGL.COLOR_BUFFER_BIT | WebGL.DEPTH_BUFFER_BIT);

    // Pass in all uniforms
    WebGL.uniformMatrix4fv(ProgramInfo.UniformLocations.VertexTransformationMatrix, false, ModelViewProjectionMatrix);
    WebGL.uniformMatrix4fv(ProgramInfo.UniformLocations.NormalTransformationMatrix, false, NormalMatrix);
    WebGL.uniformMatrix4fv(ProgramInfo.UniformLocations.LightSpaceMatrix, false, LightSpaceMatrix);
    WebGL.uniformMatrix4fv(ProgramInfo.UniformLocations.ModelMatrix, false, ModelMatrix);
    WebGL.uniform1f(ProgramInfo.UniformLocations.Time, Time);

    // Bind position buffer
    WebGL.bindBuffer(WebGL.ARRAY_BUFFER, PositionBuffer);
    WebGL.vertexAttribPointer(ProgramInfo.AttribLocations.VertexPosition, 3, WebGL.FLOAT, false, 0, 0);
    WebGL.enableVertexAttribArray(ProgramInfo.AttribLocations.VertexPosition);

    // Bind texture coord buffer
    WebGL.bindBuffer(WebGL.ARRAY_BUFFER, TextureCoordBuffer);
    WebGL.vertexAttribPointer(ProgramInfo.AttribLocations.TextureCoord, 2, WebGL.FLOAT, false, 0, 0);
    WebGL.enableVertexAttribArray(ProgramInfo.AttribLocations.TextureCoord);

    // Bind normal buffer
    WebGL.bindBuffer(WebGL.ARRAY_BUFFER, NormalVectorBuffer);
    WebGL.vertexAttribPointer(ProgramInfo.AttribLocations.NormalVector, 3, WebGL.FLOAT, false, 0, 0);
    WebGL.enableVertexAttribArray(ProgramInfo.AttribLocations.NormalVector);

    // Bind color buffer
    WebGL.bindBuffer(WebGL.ARRAY_BUFFER, ColorBuffer);
    WebGL.vertexAttribPointer(ProgramInfo.AttribLocations.SurfaceColor, 3, WebGL.FLOAT, false, 0, 0);
    WebGL.enableVertexAttribArray(ProgramInfo.AttribLocations.SurfaceColor);

    // Bind shadow map texture
    WebGL.activeTexture(WebGL.TEXTURE0);
    WebGL.bindTexture(WebGL.TEXTURE_2D, ShadowMap);
    WebGL.uniform1i(ProgramInfo.UniformLocations.ShadowMap, 0);

    // Bind text texture
    WebGL.activeTexture(WebGL.TEXTURE1);
    WebGL.bindTexture(WebGL.TEXTURE_2D, TextTexture);
    WebGL.uniform1i(ProgramInfo.UniformLocations.TextTexture, 1);

    // Draw the triangles
    WebGL.drawArrays(WebGL.TRIANGLES, 0, TriangleCount);

    // Schedule the next frame
    if (State === "Retro") {requestAnimationFrame(UpdateScene);}
}

// None 3d rendering stuff // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

function FadeAudio()
{
    // Fade audio out
    if (State === "Modern")
    {
        ComputerBoot.volume = Math.max(0, ComputerBoot.volume - (0.5 / 30));
        ComputerAmbient.volume = Math.max(0, ComputerAmbient.volume - (0.25 / 30));

        if (ComputerBoot.volume > 0) {requestAnimationFrame(FadeAudio);}
    }

    // Fade audio in
    else
    {
        ComputerBoot.volume = Math.min(0.5, ComputerBoot.volume + (0.5 / 30));
        ComputerAmbient.volume = Math.min(0.25, ComputerAmbient.volume + (0.25 / 30));

        if (ComputerBoot.volume < 0.5) {requestAnimationFrame(FadeAudio);}
    }
}

let State = "Modern";

const MainButton = document.getElementById("MainButton");
const MainDiv = document.getElementById("MainDiv");

MainButton.onclick = function() {ChangeState();};

function ChangeState()
{
    // Rotate arrow inside the main button
    let Rotation = parseInt((MainButton.style.transform || "0").match(/\d+/)) + 180;
    MainButton.style.transform = `rotateZ(${Rotation}deg)`;

    if (State === "Modern")
    {
        State = "Retro";
        MainDiv.classList.add("hidden");

        Canvas.focus();
        requestAnimationFrame(UpdateScene);
    }

    else
    {
        State = "Modern";
        MainDiv.classList.remove("hidden");
    }

    requestAnimationFrame(FadeAudio);
}

const MouseGlow = document.getElementById("MouseGlow");

// Make mouse glow follow mouse
window.addEventListener("mousemove", (event) => {
    MouseGlow.animate({left: `${event.clientX}px`, top: `${event.clientY}px`}, {duration: 3500, fill: "forwards"});
});

// Scrollspy logic // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

const RightPanel = document.getElementById("RightPanel")
const NavItems = document.querySelectorAll(".NavItem");
const Sections = document.querySelectorAll(".Section");

// Function to detect which section user is scrolled to currently
function SetActiveSection()
{
    let Index = Sections.length;
    while(--Index && RightPanel.scrollTop + 150 < Sections[Index].offsetTop) {}
    NavItems.forEach((item) => item.classList.remove('Active'));
    NavItems[Index].classList.add('Active');
}

// Function to scroll to selected section when scroll spy clicked
function ScrollToSection(event)
{
    const SectionId = event.currentTarget.getAttribute('DataSection');
    const TargetSection = document.getElementById(SectionId);
    RightPanel.scrollTo({top: TargetSection.offsetTop - window.innerHeight * 0.1, behavior: "smooth"});
}

NavItems.forEach(item => item.addEventListener("click", ScrollToSection));
RightPanel.addEventListener("scroll", SetActiveSection);
SetActiveSection();

// Projects list logic // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

const Projects = document.querySelectorAll(".Project");
const Letters = "abcdefghijklmnopqrstuvwxtz0123456789";

// For every project item
Projects.forEach(Project => {

    // When mouse enters item
    Project.addEventListener('mouseenter', event => {

        // For every text object in item
        event.target.querySelectorAll("p").forEach(Text => {
    
            let Iteration = 0;
            
            let Interval = setInterval(() => {
                
                // Split text into its letters
                Text.innerText = Text.innerText.split("")
                
                // Assign each letter a new value
                .map((letter, index) => {
                
                    // Return original letter
                    if(index < Iteration || Text.dataset.value[index] == " ") { return Text.dataset.value[index]; }

                    // Return random letter
                    return Letters[Math.floor(Math.random() * 36)]
                
                }).join(""); // Join the word back togeather from the letters
                
                if(Iteration >= Text.dataset.value.length){ clearInterval(Interval); }
                
                Iteration += 1;
                
            }, 30);
        });
    });
});
