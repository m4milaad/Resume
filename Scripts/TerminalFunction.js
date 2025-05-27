
// All previous outputs from commands and such
let OutputsText = "";
// Lets user scroll through the past outputs
let ScrollOffset = 0;

// String to store the current text input
let InputText = "";
// Dictionary to store info about the text blinker
let Blinker = { Index: 0, Time: Date.now() * 0.001 };

// Current directory
let Directory = "C:/Users/guest";

// Stores weather to render plasma or normal terminal
let DisplayPlasma = false;

// Function to give text for rendering
function GetText() {
    // Text to be displayed
    let FinalText = "";

    if (Time < 5 || OutputsText.split("\n").length < 19) // If in boot sequence
    {
        BootSequence();
        FinalText = OutputsText;
    }

    else if (!DisplayPlasma) // If not in boot sequence
    {
        // Trim the previous output to be displayed
        let Lines = OutputsText.split("\n");
        FinalText += Lines.slice(ScrollOffset, Math.min(ScrollOffset + 30, Lines.length)).join("\n");

        // Check if command input is on screen
        if (ScrollOffset + 30 >= Lines.length) {
            if ((Date.now() * 0.001 - Blinker.Time) % 1 < 0.5) // Show blinker
            {
                FinalText += `${Directory}> ${InputText.slice(0, Blinker.Index)}█${InputText.slice(Blinker.Index + 1, InputText.length)}`;
            }

            else // Dont show blinker
            {
                FinalText += `${Directory}> ${InputText}`;
            }
        }
    }

    else {
        return GetTextPlasma();
    }

    return FinalText;
}

// Function to handle key press and text input
function KeyPressed(key) {
    if (DisplayPlasma) {
        if (key === "Escape") {
            DisplayPlasma = false;
        }
    }

    else if (Time > 5) {
        let LinesCount = OutputsText.split("\n").length;

        if (key.length === 1 && InputText.length + Directory.length + 3 < 55) // Add character
        {
            InputText = InputText.slice(0, Blinker.Index) + key.toLowerCase() + InputText.slice(Blinker.Index, InputText.length);
            Blinker = { Index: Blinker.Index + 1, Time: Date.now() * 0.001 }; // Update blinker pos and reset its time
            if (ScrollOffset < LinesCount - 30) { ScrollOffset = Math.max(0, LinesCount - 30); } // Reset the scroll if off screen
        }

        else if (key === "Backspace" && InputText && Blinker.Index > 0) // Remove character
        {
            InputText = InputText.slice(0, Blinker.Index - 1) + InputText.slice(Blinker.Index, InputText.length);
            Blinker = { Index: Blinker.Index - 1, Time: Date.now() * 0.001 }; // Update blinker pos and reset its time
            if (ScrollOffset < LinesCount - 30) { ScrollOffset = Math.max(0, LinesCount - 30); } // Reset the scroll if off screen
        }

        else if (key === "ArrowLeft") // Move blinker left
        {
            Blinker = { Index: Math.max(0, Blinker.Index - 1), Time: Date.now() * 0.001 };
        }

        else if (key === "ArrowRight") // Move blinker right
        {
            Blinker = { Index: Math.min(InputText.length, Blinker.Index + 1), Time: Date.now() * 0.001 };
        }

        else if (key === "ArrowUp") // Scroll text upwards
        {
            ScrollOffset = Math.max(0, ScrollOffset - 1);
        }

        else if (key === "ArrowDown") // Scroll text downwards
        {
            ScrollOffset = Math.min(LinesCount - 1, ScrollOffset + 1);
        }

        else if (key === "Tab") // Auto complete
        {
            AutoComplete(); // Complete input text
            Blinker = { Index: InputText.length, Time: Date.now() * 0.001 }; // Update blinker pos and reset its time
            if (ScrollOffset < LinesCount - 30) { ScrollOffset = Math.max(0, LinesCount - 30); } // Reset the scroll if off screen
        }

        else if (key === "Enter") // Submit text
        {
            OutputsText += `${Directory}> ${InputText}\n`;
            ExecuteCommand();

            InputText = "";
            Blinker = { Index: 0, Time: Date.now() * 0.001 };

            LinesCount = OutputsText.split("\n").length;
            if (ScrollOffset < LinesCount - 30) { ScrollOffset = Math.max(0, LinesCount - 30); }
        }
    }
}

function BootSequence() {
    OutputsText = "";
    let LoadingChars = ["-", "\\", "|", "/"];
    
    if (Time > 0.1) { OutputsText += "███╗   ███╗██╗██╗     ████╗   ██████╗     █████╗  \n"; }
    if (Time > 0.2) { OutputsText += "████╗ ████║██║██║     ██╔═██╗ ██╔══██╗   ██╔══██╗ \n"; }
    if (Time > 0.3) { OutputsText += "██╔████╔██║██║██║     ██████║ ██║  ██║   ███████║ \n"; }
    if (Time > 0.4) { OutputsText += "██║╚██╔╝██║██║██║     ██╔═██║ ██║  ██║   ██╔══██║ \n"; }
    if (Time > 0.5) { OutputsText += "██║ ╚═╝ ██║██║███████╗██║ ██║ ██████╔╝██╗██║  ██║ \n"; }
    if (Time > 0.6) { OutputsText += "╚═╝     ╚═╝╚═╝╚══════╝╚═╝ ╚═╝ ╚═════╝ ╚═╝╚═╝  ╚═╝\n\n\n"; }
    if (Time > 1.1) { OutputsText += "Welcome to Milad.A 1.0.0 x86_64\n"; }
    if (Time > 1.2) { OutputsText += "Type 'help' to list available commands\n\n\n"; }
    if (Time > 1.7) { OutputsText += `Loading ${LoadingChars[Math.ceil((Math.min(3.7, Time) % 0.4) / 0.1) - 1]} ${Math.ceil(Math.min(100, (Time - 1.7) / 0.02))}%\n`; }
    if (Time > 3.7) { OutputsText += ".\n"; }
    if (Time > 3.8) { OutputsText += ".\n"; }
    if (Time > 3.9) { OutputsText += ".\n"; }
    if (Time > 4.0) { OutputsText += "Complete!\n\n"; }


    ScrollOffset = Math.min(OutputsText.split("\n").length - 1, ScrollOffset);
}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

// File system structure (unchanged)
const FileSystem = {
    "root": {
        type: "directory", contents: {

            "projects": {
                type: "directory", contents: {
                    "projects.txt": { type: "file", content: "Below are some of the projects I have developed over\nmy 6+ years of coding. This is just a small selection\nof the many projects I've worked on, with several\nothers not making the list. Please note that some of\nthese projects are unfinished—either because I lacked\nthe necessary skills at the time or simply moved on to\nmore interesting challenges. However, rest assured I\nplan to revisit and polish these projects in the future\nimproving their code with my current level of expertise." },
                    "lighting_engine.lnk": { type: "link", content: "https://github.com/LuckeyDuckey/Pygame_Lighting_Engine" },
                    "wakeword_engine.lnk": { type: "link", content: "https://github.com/LuckeyDuckey/Python-Wake-Word-Engine" },
                    "square_game_halloween.lnk": { type: "link", content: "https://github.com/LuckeyDuckey/Square-Game-Halloween" },
                    "personal_website.lnk": { type: "link", content: "https://github.com/LuckeyDuckey/luckeyduckey.github.io/tree/main" },
                    "password_vault.lnk": { type: "link", content: "https://github.com/LuckeyDuckey/Password-Vault" },
                    "jarvis.lnk": { type: "link", content: "https://github.com/LuckeyDuckey/Jarvis" },
                }
            },

            "about.txt": { type: "file", content: "I’m an aspiring software developer with a passion\nfor exploring the vast possibilities of programming.\nI’ve been coding since I was 12, starting with small\ngames in Python and evolving into a diverse range of\nprojects. Over the years, I’ve delved into AI,\nmachine learning, graphics programming, cybersecurity\nand web development. My experience spans from creating\nvirtual assistants and VR applications to developing\nshaders and procedurally generated visuals. I’m driven\nby a love for technology and a desire to learn, create\nand solve complex problems. I’m proficient in Python\nC++, JavaScript, and C#, with Python being my\nstrongest language." },
            "experience.txt": { type: "file", content: "Error 404 not found. That's right I have no\nprofessional in industry experience, however I still\nbring over 6 years of hands-on experience in coding\nand software development from personal projects and\nself-driven learning. I’ve tackled a wide range of\nchallenges, from developing AI-powered virtual\nassistants and machine learning models to creating\ngraphics and VR applications. My projects have allowed\nme to build strong skills in Python, C++, JavaScript\nand C#, and I’ve gained a solid foundation in problem\nsolving, collaboration, and adaptability. I’m eager\nto apply my knowledge and passion for technology in\na professional setting, where I can continue to learn\nand grow as a software developer." },
            "plasma.exe": { type: "executable", content: "plasma" },
        }
    },
};

function ListFiles() {
    // Move to current folder
    let DirectoryContents = FileSystem.root;
    for (let Dir of Directory.slice(15).split("/").filter(Boolean)) { DirectoryContents = DirectoryContents.contents[Dir]; }

    // Print directory being listed
    OutputsText += `\nC:/../${Directory.split("/").slice(-1)}`;

    // Print each file
    const Files = Object.keys(DirectoryContents.contents);
    for (let [Index, File] of Files.entries()) { OutputsText += `\n${Index == Files.length - 1 ? "┗" : "┣"}${File.includes(".") ? "━▷" : "━━━━"} ${File}`; }

    OutputsText += "\n\n";
}

function ChangeDirectory(InputDirectory) {
    let CurrentDirectory = Directory.slice(15).split("/").filter(Boolean);

    // Go back a folder
    if (InputDirectory === "..") { CurrentDirectory.pop(); }

    // Return to root folder
    else if (InputDirectory === "/") { CurrentDirectory = []; }

    // Move to new folder
    else {
        // Move to current folder
        let DirectoryContents = FileSystem.root;
        for (let Dir of CurrentDirectory) { DirectoryContents = DirectoryContents.contents[Dir]; }

        // Add new folder to path
        if (DirectoryContents.contents[InputDirectory] && DirectoryContents.contents[InputDirectory].type === "directory") { CurrentDirectory.push(InputDirectory); }

        // Desired path dousnt exist
        else { OutputsText += `\ncd: '${InputDirectory}' No such directory\n\n`; return; }
    }

    Directory = `C:/Users/guest${CurrentDirectory.length ? "/" : ""}${CurrentDirectory.join("/")}`;
}

function StartFile(InputFile) {
    // Move to current folder
    let DirectoryContents = FileSystem.root;
    for (let Dir of Directory.slice(15).split("/").filter(Boolean)) { DirectoryContents = DirectoryContents.contents[Dir]; }

    // Perform action based on what file is opened
    if (DirectoryContents.contents[InputFile] && DirectoryContents.contents[InputFile].type === "file") {
        OutputsText += `\n${DirectoryContents.contents[InputFile].content}\n\n`;
    }

    else if (DirectoryContents.contents[InputFile] && DirectoryContents.contents[InputFile].type === "link") {
        OutputsText += `\nRedirecting to '${DirectoryContents.contents[InputFile].content}'\n\n`;
        window.open(DirectoryContents.contents[InputFile].content);
    }

    else if (DirectoryContents.contents[InputFile] && DirectoryContents.contents[InputFile].type === "executable") {
        OutputsText += `\n'${InputFile}' Started successfully\n\n`;
        DisplayPlasma = true;
    }

    // Selected file dousnt exist
    else { OutputsText += `\nstart: '${InputFile}' No such file\n\n`; }
}

// Modified ExecuteCommand function
function ExecuteCommand() {
    const [Command, ...Arguments] = InputText.split(" ");

    if (Command) {
        ComputerBeep.play();
        ComputerBeep.currentTime = 0;
    }

    switch (Command) {
        case "ls":
            if (Arguments.length) { OutputsText += "\nError: 'ls' doesn't accept any arguments\n\n"; }
            else { ListFiles(); }
            break;

        case "cd":
            if (Arguments.length > 1) { OutputsText += "\nError: 'cd' doesn't accept more that one argument\n\n"; }
            else { ChangeDirectory(Arguments[0]); }
            break;

        case "start":
            if (Arguments.length > 1) { OutputsText += "\nError: 'start' doesn't accept more that one argument\n\n"; }
            else { StartFile(Arguments[0]); }
            break;

        case "clear":
            if (Arguments.length) { OutputsText += "\nError: 'clear' doesn't accept any arguments\n\n"; }
            else { BootSequence(); }
            break;

        case "help":
            if (Arguments.length) { OutputsText += "\nError: 'help' doesn't accept any arguments\n\n"; }
            else { OutputsText += "\nPress 'tab' for auto complete and press 'esc' to exit\na program (.exe file)\n\nLS       Lists current directory contents\nCD       Change directory, '..' moves back, '/' to root\nSTART    Opens specified file in current directory\nCLEAR    Clears all previous terminal outputs\n\n"; }
            break;

        case "":
            break;

        default:
            OutputsText += `\nCommand not found '${Command}'\n\n`;
    }
}

// Autocomplete function
function AutoComplete() {
    const [Command, ...Arguments] = InputText.split(" ");
    const CommandsList = ["ls", "cd", "start", "clear"];

    // Auto completing a command
    if (!Arguments.length) {
        const CompletededCommand = CommandsList.filter(Element => Element.startsWith(Command));
        if (CompletededCommand.length) { InputText = CompletededCommand[0] };
    }

    // Auto comepleting a file name
    if (["cd", "start"].includes(Command) && Arguments.length < 2) {
        // Move to current folder
        let DirectoryContents = FileSystem.root;
        for (let Dir of Directory.slice(15).split("/").filter(Boolean)) { DirectoryContents = DirectoryContents.contents[Dir]; }

        // Possible file names
        const PossibleCompletions = Object.keys(DirectoryContents.contents).filter(Item => Item.startsWith(Arguments));
        if (PossibleCompletions.length) { InputText = `${Command} ${PossibleCompletions[0]}`; }
    }
}

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

function GetTextPlasma() {
    const Letters = [" ", "_", "a", "b", "c", "ö", "õ", "ö", "#", "$", "%", "1", "2", "3", "A", "B", "C"];
    let Text = "";

    for (let Row = 1; Row < 31; Row++) {
        for (let Col = 1; Col < 56; Col++) {
            const Intensity = GetIntensityPlasma(Row / 30, Col / 55);
            Text += Letters[Math.max(Math.min(Math.floor(Intensity) - 1, Letters.length - 1), 0)];
        }

        Text += "\n";
    }

    return Text
}

function GetIntensityPlasma(Row, Col) {
    let Intensity = 0.0;

    Intensity += 0.7 * Math.sin(0.5 * Row + Time / 5);
    Intensity += 3 * Math.sin(1.6 * Col + Time / 5);
    Intensity += 1 * Math.sin(10 * (Col * Math.sin(Time / 2) + Row * Math.cos(Time / 5)) + Time / 2);

    const CyclicX = Row + 0.5 * Math.sin(Time / 2);
    const CyclicY = Col + 0.5 * Math.cos(Time / 4);

    Intensity += 0.4 * Math.sin(Math.sqrt(100 * CyclicX ** 2 + 100 * CyclicY ** 2 + 1) + Time);
    Intensity += 0.9 * Math.sin(Math.sqrt(75 * CyclicX ** 2 + 25 * CyclicY ** 2 + 1) + Time);
    Intensity += -1.4 * Math.sin(Math.sqrt(256 * CyclicX ** 2 + 25 * CyclicY ** 2 + 1) + Time);
    Intensity += 0.3 * Math.sin(0.5 * Col + Row + Math.sin(Time));

    return 17 * (0.5 + 0.499 * Math.sin(Intensity)) * (0.7 + Math.sin(Time) * 0.3);
}
