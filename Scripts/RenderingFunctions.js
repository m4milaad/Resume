
// Set the canvas size to match the display size
function ResizeCanvasToDisplaySize(Canvas)
{
    const DisplayWidth = window.innerWidth;
    const DisplayHeight = window.innerHeight;

    if (Canvas.width !== DisplayWidth || Canvas.height !== DisplayHeight)
    {
        Canvas.width = DisplayWidth;
        Canvas.height = DisplayHeight;

        WebGL.viewport(0, 0, DisplayWidth, DisplayHeight);
    }
}

// Function to create a shader
function LoadShader(WebGL, Type, Source)
{
    const Shader = WebGL.createShader(Type);

    WebGL.shaderSource(Shader, Source);
    WebGL.compileShader(Shader);

    if (WebGL.getShaderParameter(Shader, WebGL.COMPILE_STATUS))
    {
        return Shader;
    }

    alert("An error occurred compiling the shaders: " + WebGL.getShaderInfoLog(Shader));
    WebGL.deleteShader(Shader);
}

function LoadMaterials(MaterialFile)
{
    // Define materials dicionary and current material
    const Materials = {};
    let CurrentMaterial = null;

    // Split the input text into individual lines
    const Lines = MaterialFile.split("\n");

    // Iterate over each line
    for (const Line of Lines)
    {
        // Trim whitespace from the start and end of the line
        const LineTrimmed = Line.trim();

        // Split the line at every space
        const Parts = LineTrimmed.split(/\s+/);

        // If line is a new material
        if (LineTrimmed.startsWith("newmtl "))
        {
            CurrentMaterial = Parts[1];
            Materials[CurrentMaterial] = {};
        }

        // If line is a material color
        else if (LineTrimmed.startsWith("Kd ") && CurrentMaterial)
        {
            Materials[CurrentMaterial].Color = Parts.slice(1, 4).map(parseFloat);
        }
    }

    return Materials;
}

function GenerateVertexArray(Vertices, TextureCoords, FlatNormals, SmoothNormals, Materials, Faces)
{
    const VertexArray = [];
    const TextureCoordArray = [];
    const NormalArray = [];
    const ColorArray = [];
    
    for (const Face of Faces)
    {
        const [VerticesIndices, TextureCoordIndices, NormalIndices, MaterialIndice] = Face;
        
        // Check the number of vertices in the face
        const NumVertices = VerticesIndices.length;

        if (NumVertices < 3)
        {
            continue; // Skip faces with less than 3 vertices
        }

        // Get face color and default to white if no material found
        const FaceColor = Materials[MaterialIndice]?.Color || [1, 1, 1];
        
        // Triangulate the face using the first vertex as a reference
        for (let i = 1; i < NumVertices - 1; i++) // COULD BE BROKEN REPLACE i=0 WITH i=1 VISEVERSA
        {
            // Must perform for all 3 points of triangle
            for (let Index of [0, i, i + 1])
            {
                VertexArray.push(...Vertices[VerticesIndices[Index]]);
                TextureCoordArray.push(...TextureCoords[TextureCoordIndices[Index]]);
                ColorArray.push(...FaceColor);

                // If face color is red then its part of the screen so sample smooth normlas
                if (FaceColor[0] > 0.9 && FaceColor[1] < 0.1) {NormalArray.push(...SmoothNormals[VerticesIndices[Index]]);}
                else {NormalArray.push(...FlatNormals[NormalIndices[Index]]);}
            }
        }
    }

    return [VertexArray, TextureCoordArray, NormalArray, ColorArray]
}

function CalculateVertexNormals(Vertices, Faces)
{
    // Initialize arrays to store accumulated normals and count for each vertex
    const VertexNormals = [];
    const VertexCounts = [];

    for (let i = 0; i < Vertices.length; i++)
    {
        VertexNormals.push([0, 0, 0]);
        VertexCounts.push(0);
    }

    // Iterate through each face
    for (const Face of Faces)
    {
        const VerticesIndices = Face[0];

        // Skip faces with less than 3 vertices
        if (VerticesIndices.length < 3)
        {
            continue;
        }

        // Get the vertices of the face
        const VertexA = Vertices[VerticesIndices[0]];
        const VertexB = Vertices[VerticesIndices[1]];
        const VertexC = Vertices[VerticesIndices[2]];

        // Calculate two edges of the face
        const EdgeA = [VertexB[0] - VertexA[0], VertexB[1] - VertexA[1], VertexB[2] - VertexA[2]];
        const EdgeB = [VertexC[0] - VertexA[0], VertexC[1] - VertexA[1], VertexC[2] - VertexA[2]];

        // Calculate the face normal using cross product of the two edges
        const Normal = [
            EdgeA[1] * EdgeB[2] - EdgeA[2] * EdgeB[1],  // x component
            EdgeA[2] * EdgeB[0] - EdgeA[0] * EdgeB[2],  // y component
            EdgeA[0] * EdgeB[1] - EdgeA[1] * EdgeB[0]   // z component
        ];

        // Add the face normal to all vertices of this face
        for (const Index of VerticesIndices)
        {
            // Accumulate the normal
            VertexNormals[Index][0] += Normal[0];
            VertexNormals[Index][1] += Normal[1];
            VertexNormals[Index][2] += Normal[2];

            // Increment the count for this vertex
            VertexCounts[Index]++;
        }
    }

    // Normalize the accumulated normals
    for (let i = 0; i < VertexNormals.length; i++)
    {
        // Only normalize if the vertex was used in at least one face
        if (VertexCounts[i] > 0)
        {
            VertexNormals[i] = Normalize(VertexNormals[i]);
        }
    }

    return VertexNormals;
}

function LoadObject(ObjectFile, MaterialFile)
{
    const Vertices = [];
    const TextureCoords = [];
    const FlatNormals = [];
    const Faces = [];

    // Define materials
    const Materials = LoadMaterials(MaterialFile);
    let CurrentMaterial = null;

    // Split the input text into individual lines
    const Lines = ObjectFile.split("\n");
  
    // Iterate over each line
    for (const Line of Lines)
    {
        // Trim whitespace from the start and end of the line
        const LineTrimmed = Line.trim();

        // Split the line at every space
        const Parts = LineTrimmed.split(/\s+/);

        // If line is a vertex position
        if (LineTrimmed.startsWith("v "))
        {
            // Get array excluding the first element ("v")
            const VertexData = Parts.slice(1);

            // Convert each substring to a floating-point number
            const FloatData = VertexData.map(parseFloat);

            // Store vertex position
            Vertices.push(FloatData);
        }

        // If line is a texture coord
        else if (LineTrimmed.startsWith("vt "))
        {
            // Get array excluding the first element ("vt")
            const TextureData = Parts.slice(1);
            
            // Convert each substring to a floating-point number
            const FloatData = TextureData.map(parseFloat);
            
            // Store texture coord
            TextureCoords.push(FloatData);
        }

        // If line is a normal position
        else if (LineTrimmed.startsWith("vn "))
        {
            // Get array excluding the first element ("vn")
            const NormalData = Parts.slice(1);
    
            // Convert each substring to a floating-point number
            const FloatData = NormalData.map(parseFloat);
    
            // Store normal vector
            FlatNormals.push(FloatData);
        }

        // If line sets material
        else if (LineTrimmed.startsWith("usemtl "))
        {
            // Set the current material to most recently seen one
            CurrentMaterial = Parts[1];
        }

        // If line defines a face
        else if (LineTrimmed.startsWith("f "))
        {
            // Split line at every space and exclude first element
            const Face = Parts.slice(1);
            
            // Each face have vertex position indices
            const FaceVertices = [];
            const FaceTextureCoord = [];
            const FaceNormals = [];

            for (const Vertex of Face)
            {
                // Get indexs of vertex, normal, and texcood
                const Indices = Vertex.split("/");

                // Extract vertex index minus one for array indexing
                FaceVertices.push(parseInt(Indices[0]) - 1);

                // Extract TextureCoord index minus one for array indexing
                FaceTextureCoord.push(parseInt(Indices[1]) - 1);

                // Extract normal index minus one for array indexing
                FaceNormals.push(parseInt(Indices[2]) - 1);
            }

            // Store vertex indexes
            Faces.push([FaceVertices, FaceTextureCoord, FaceNormals, CurrentMaterial]);
        }

        // If line type is unrecognized
        else
        {
            continue;
        }
    }

    const SmoothNormals = CalculateVertexNormals(Vertices, Faces);

    return GenerateVertexArray(Vertices, TextureCoords, FlatNormals, SmoothNormals, Materials, Faces);
}

function GenerateShadowMap(ShadowMapWidth, ShadowMapHeight, LightSpaceMatrix)
{
    // Create a framebuffer object for shadow mapping
    const ShadowFramebuffer = WebGL.createFramebuffer();
    WebGL.bindFramebuffer(WebGL.FRAMEBUFFER, ShadowFramebuffer);

    // Create a depth texture for the shadow map
    const ShadowDepthTexture = WebGL.createTexture();
    WebGL.bindTexture(WebGL.TEXTURE_2D, ShadowDepthTexture);
    WebGL.texImage2D(WebGL.TEXTURE_2D, 0, WebGL.DEPTH_COMPONENT24, ShadowMapWidth, ShadowMapHeight, 0, WebGL.DEPTH_COMPONENT, WebGL.UNSIGNED_INT, null);
    WebGL.texParameteri(WebGL.TEXTURE_2D, WebGL.TEXTURE_MIN_FILTER, WebGL.NEAREST);
    WebGL.texParameteri(WebGL.TEXTURE_2D, WebGL.TEXTURE_MAG_FILTER, WebGL.NEAREST);
    WebGL.texParameteri(WebGL.TEXTURE_2D, WebGL.TEXTURE_WRAP_S, WebGL.CLAMP_TO_EDGE);
    WebGL.texParameteri(WebGL.TEXTURE_2D, WebGL.TEXTURE_WRAP_T, WebGL.CLAMP_TO_EDGE);

    WebGL.framebufferTexture2D(WebGL.FRAMEBUFFER, WebGL.DEPTH_ATTACHMENT, WebGL.TEXTURE_2D, ShadowDepthTexture, 0);

    if (WebGL.checkFramebufferStatus(WebGL.FRAMEBUFFER) !== WebGL.FRAMEBUFFER_COMPLETE)
    {
        alert("Shadow framebuffer is not complete");
    }

    WebGL.bindFramebuffer(WebGL.FRAMEBUFFER, null);

    // Vertex shader source code
    const ShadowVertexSource = `#version 300 es
    in vec4 VertexPosition;

    uniform mat4 LightSpaceMatrix;

    void main(void)
    {
        gl_Position = LightSpaceMatrix * VertexPosition;
    }`;

    // Fragment shader source code
    const ShadowFragmentSource = `#version 300 es
    precision highp float;

    void main(void)
    {
        // gl_FragDepth is automatically written, no need to do anything here
    }`;

    // Load vertex and fragment shaders
    const ShadowVertexShader = LoadShader(WebGL, WebGL.VERTEX_SHADER, ShadowVertexSource);
    const ShadowFragmentShader = LoadShader(WebGL, WebGL.FRAGMENT_SHADER, ShadowFragmentSource);

    // Create the shader program
    const ShadowShaderProgram = WebGL.createProgram();
    WebGL.attachShader(ShadowShaderProgram, ShadowVertexShader);
    WebGL.attachShader(ShadowShaderProgram, ShadowFragmentShader);
    WebGL.linkProgram(ShadowShaderProgram);

    if (!WebGL.getProgramParameter(ShadowShaderProgram, WebGL.LINK_STATUS)) {
        alert("Unable to initialize the shadow shader program: " + WebGL.getProgramInfoLog(ShadowShaderProgram));
    }

    // Collect shader attributes and uniform locations
    const ShadowProgramInfo = {
        AttribLocations:
        {
            VertexPosition: WebGL.getAttribLocation(ShadowShaderProgram, "VertexPosition"),
        },

        UniformLocations:
        {
            LightSpaceMatrix: WebGL.getUniformLocation(ShadowShaderProgram, "LightSpaceMatrix"),
        },
    };

    // Tell WebGL to use shadow map program for rendering
    WebGL.useProgram(ShadowShaderProgram);

    // Bind frame buffer and viewport then clear texture for rendering
    WebGL.bindFramebuffer(WebGL.FRAMEBUFFER, ShadowFramebuffer);
    WebGL.viewport(0, 0, ShadowMapWidth, ShadowMapHeight);
    WebGL.clear(WebGL.DEPTH_BUFFER_BIT);

    // Bind position buffer
    WebGL.bindBuffer(WebGL.ARRAY_BUFFER, PositionBuffer);
    WebGL.enableVertexAttribArray(ShadowProgramInfo.AttribLocations.VertexPosition); // Enable the attribute
    WebGL.vertexAttribPointer(ShadowProgramInfo.AttribLocations.VertexPosition, 3, WebGL.FLOAT, false, 0, 0); // Tell the attribute how to get data out of buffer
    
    // Pass in all uniforms
    WebGL.uniformMatrix4fv(ShadowProgramInfo.UniformLocations.LightSpaceMatrix, false, LightSpaceMatrix);
    
    // Draw the triangles
    WebGL.drawArrays(WebGL.TRIANGLES, 0, TriangleCount);

    // Return final rendered texture
    return ShadowDepthTexture
}

function Normalize(Vector)
{
    let Distance = Math.sqrt(Vector[0] ** 2 + Vector[1] ** 2 + Vector[2] ** 2);

    // Avoid div 0 error
    if (Distance > 0.00001)
    {
        return [Vector[0] / Distance, Vector[1] / Distance, Vector[2] / Distance];
    }

    else
    {
        return [0, 0, 0];
    }
}

function SubtractVectors(VectorA, VectorB)
{
    return [VectorA[0] - VectorB[0], VectorA[1] - VectorB[1], VectorA[2] - VectorB[2]];
}

function Cross(VectorA, VectorB)
{
    return [
        VectorA[1] * VectorB[2] - VectorA[2] * VectorB[1],
        VectorA[2] * VectorB[0] - VectorA[0] * VectorB[2],
        VectorA[0] * VectorB[1] - VectorA[1] * VectorB[0],
    ];
}

function Dot(VectorA, VectorB)
{
    return VectorA[0] * VectorB[0] + VectorA[1] * VectorB[1] + VectorA[2] * VectorB[2];
}

function Determinant3x3(A, B, C, D, E, F, G, H, I)
{
    return A * (E * I - F * H) - B * (D * I - F * G) + C * (D * H - E * G);
}

const MatrixFunctions = {
    Orthographic: function(Left, Right, Bottom, Top, Near, Far)
    {
        return [
            2 / (Right - Left), 0, 0, -(Right + Left) / (Right - Left),
            0, 2 / (Top - Bottom), 0, -(Top + Bottom) / (Top - Bottom),
            0, 0, 2 / (Far - Near), -(Far + Near) / (Far - Near),
            0, 0, 0, 1,
        ];
    },

    LookAt: function(CameraPosition, TargetPosition, UpVector)
    {
        var Forward = Normalize(SubtractVectors(TargetPosition, CameraPosition));
        var Side = Normalize(Cross(UpVector, Forward));
        var Up = Normalize(Cross(Forward, Side));
     
        return [
            Side[0], Side[1], Side[2], -Dot(Side, TargetPosition),
            Up[0], Up[1], Up[2], -Dot(Up, TargetPosition),
            -Forward[0], -Forward[1], -Forward[2], -Dot(Forward, TargetPosition),
            0, 0, 0, 1,
        ];
    },

    Perspective: function(FieldOfViewRadians, AspectRatio, NearPlane, FarPlane)
    {
        const TanFov = 1.0 / Math.tan(FieldOfViewRadians * 0.5);
        const Range = 1.0 / (NearPlane - FarPlane);
     
        return [
            TanFov / AspectRatio, 0, 0, 0,
            0, TanFov, 0, 0,
            0, 0, (FarPlane + NearPlane) * Range, 2 * FarPlane * NearPlane * Range,
            0, 0, -1, 0
        ];
    },

    Base: function()
    {
        return [1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 1,
                0, 0, 0, 1];
    },

    Translate: function(Matrix, TranslationX, TranslationY, TranslationZ)
    {
        const Translation = [
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            TranslationX, TranslationY, TranslationZ, 1,
        ];

        return MatrixFunctions.Multiply(Matrix, Translation);
    },
    
    RotateX: function(Matrix, AngleRadians)
    {
        const CosAngle = Math.cos(AngleRadians);
        const SinAngle = Math.sin(AngleRadians);

        const RotationX = [
            1, 0, 0, 0,
            0, CosAngle, SinAngle, 0,
            0, -SinAngle, CosAngle, 0,
            0, 0, 0, 1,
        ];

        return MatrixFunctions.Multiply(Matrix, RotationX);
    },
    
    RotateY: function(Matrix, AngleRadians)
    {
        const CosAngle = Math.cos(AngleRadians);
        const SinAngle = Math.sin(AngleRadians);

        const RotationY = [
            CosAngle, 0, -SinAngle, 0,
            0, 1, 0, 0,
            SinAngle, 0, CosAngle, 0,
            0, 0, 0, 1,
        ];

        return MatrixFunctions.Multiply(Matrix, RotationY);
    },
    
    RotateZ: function(Matrix, AngleRadians)
    {
        const CosAngle = Math.cos(AngleRadians);
        const SinAngle = Math.sin(AngleRadians);

        const RotationZ = [
            CosAngle, SinAngle, 0, 0,
            -SinAngle, CosAngle, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];

        return MatrixFunctions.Multiply(Matrix, RotationZ);
    },
    
    Scale: function(Matrix, ScaleX, ScaleY, ScaleZ)
    {
        const Scaling = [
            ScaleX, 0,  0,  0,
            0, ScaleY,  0,  0,
            0,  0, ScaleZ,  0,
            0,  0,  0,  1,
        ];

        return MatrixFunctions.Multiply(Matrix, Scaling);
    },

    Multiply: function(MatrixA, MatrixB)
    {
        let Result = new Array(16);
    
        for (let i = 0; i < 16; i++)
        {
            let Col = Math.floor(i / 4) * 4;
            let Row = i % 4;
    
            Result[i] = MatrixB[Col] * MatrixA[Row] + MatrixB[Col + 1] * MatrixA[Row + 4] + MatrixB[Col + 2] * MatrixA[Row + 8] + MatrixB[Col + 3] * MatrixA[Row + 12];
        }
    
        return Result;
    },

    Inverse: function(Matrix)
    {
        const InverseMatrix = new Float32Array(16);

        const A00 = Matrix[0],  A01 = Matrix[1],  A02 = Matrix[2],  A03 = Matrix[3];
        const A10 = Matrix[4],  A11 = Matrix[5],  A12 = Matrix[6],  A13 = Matrix[7];
        const A20 = Matrix[8],  A21 = Matrix[9],  A22 = Matrix[10], A23 = Matrix[11];
        const A30 = Matrix[12], A31 = Matrix[13], A32 = Matrix[14], A33 = Matrix[15];

        const Determinant = 
            A00 * Determinant3x3(A11, A21, A31, A12, A22, A32, A13, A23, A33) -
            A01 * Determinant3x3(A10, A20, A30, A12, A22, A32, A13, A23, A33) +
            A02 * Determinant3x3(A10, A20, A30, A11, A21, A31, A13, A23, A33) -
            A03 * Determinant3x3(A10, A20, A30, A11, A21, A31, A12, A22, A32);

        if (Determinant === 0)
        {
            alert("Matrix is not invertible");
        }

        const InverseDeterminant = 1.0 / Determinant;

        InverseMatrix[0]  =  InverseDeterminant * Determinant3x3(A11, A21, A31, A12, A22, A32, A13, A23, A33);
        InverseMatrix[1]  = -InverseDeterminant * Determinant3x3(A01, A21, A31, A02, A22, A32, A03, A23, A33);
        InverseMatrix[2]  =  InverseDeterminant * Determinant3x3(A01, A11, A31, A02, A12, A32, A03, A13, A33);
        InverseMatrix[3]  = -InverseDeterminant * Determinant3x3(A01, A11, A21, A02, A12, A22, A03, A13, A23);

        InverseMatrix[4]  = -InverseDeterminant * Determinant3x3(A10, A20, A30, A12, A22, A32, A13, A23, A33);
        InverseMatrix[5]  =  InverseDeterminant * Determinant3x3(A00, A20, A30, A02, A22, A32, A03, A23, A33);
        InverseMatrix[6]  = -InverseDeterminant * Determinant3x3(A00, A10, A30, A02, A12, A32, A03, A13, A33);
        InverseMatrix[7]  =  InverseDeterminant * Determinant3x3(A00, A10, A20, A02, A12, A22, A03, A13, A23);

        InverseMatrix[8]  =  InverseDeterminant * Determinant3x3(A10, A20, A30, A11, A21, A31, A13, A23, A33);
        InverseMatrix[9]  = -InverseDeterminant * Determinant3x3(A00, A20, A30, A01, A21, A31, A03, A23, A33);
        InverseMatrix[10] =  InverseDeterminant * Determinant3x3(A00, A10, A30, A01, A11, A31, A03, A13, A33);
        InverseMatrix[11] = -InverseDeterminant * Determinant3x3(A00, A10, A20, A01, A11, A21, A03, A13, A23);

        InverseMatrix[12] = -InverseDeterminant * Determinant3x3(A10, A20, A30, A11, A21, A31, A12, A22, A32);
        InverseMatrix[13] =  InverseDeterminant * Determinant3x3(A00, A20, A30, A01, A21, A31, A02, A22, A32);
        InverseMatrix[14] = -InverseDeterminant * Determinant3x3(A00, A10, A30, A01, A11, A31, A02, A12, A32);
        InverseMatrix[15] =  InverseDeterminant * Determinant3x3(A00, A10, A20, A01, A11, A21, A02, A12, A22);

        return InverseMatrix;
    },
}
