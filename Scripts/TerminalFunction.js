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

const FileSystem = {
    "root": {
        type: "directory", contents: {
            "projects": {
                type: "directory", contents: {
                    "projects.txt": { type: "file", content: "This section contains links to various projects I have worked on.\nUse 'start <project_name.lnk>' to open a project link in your browser.\nDetails about each project are implicitly available by visiting the links." },
                    "online_resume.lnk": { type: "link", content: "#", description: "Online Resume (This Site): Developed this personal online resume website. Features a responsive design and is built with HTML, Tailwind CSS, and JavaScript." },
                    "yge_website.lnk": { type: "link", content: "https://yge.ct.ws/", description: "Website: Yuva Global Enterprises: Deployed a website using HTML, CSS, and JavaScript on InfinityFree. Implemented responsive design and managed DNS." },
                    "banking_system.lnk": { type: "link", content: "https://github.com/m4milaad/Banking-System-", description: "Banking System: Developed an object-oriented banking system application using Java." },
                    "blackjack_game.lnk": { type: "link", content: "https://github.com/m4milaad/Pyhton-Projects/tree/main/BlackJack", description: "BlackJack Game: A command-line version of the classic BlackJack card game, built with Python." },
                    "states_game.lnk": { type: "link", content: "https://github.com/m4milaad/Pyhton-Projects/tree/main/States%20Guessing%20Game", description: "States Guessing Game: This Python script is an interactive game that challenges users to guess all 50 U.S. states." },
                    "coffee_machine.lnk": { type: "link", content: "https://github.com/m4milaad/Pyhton-Projects/tree/main/Coffee%20Machine", description: "OOP Coffee Machine: Simulated a coffee machine's operations with an object-oriented approach in Python." },
                    "more_projects.txt": { type: "file", content: "Many More Projects Including: Hirst Painting Generator, Pong Game, Snake Game, Peek Hour, Caesar Cipher, Hangman, Higher or Lower, Mail Merge, Number Guessing, Quiz Game, Password Generator, Rock Paper Scissor, Silent Auction, Calculator, Tip Calculator, Treasure Island, Turtle Race. (Primarily Python)" }
                }
            },
            "about.txt": { type: "file", content: "Driven and detail-oriented technologist with a solid foundation in programming, embedded systems,\nand full-stack web development. Proficient in Python (core strength), C, Java, JavaScript, and C++,\nwith hands-on experience in building responsive web dashboards, smart IoT systems using Arduino, and\nrobust software solutions. Adept at object-oriented design, DNS management, and site monitoring,\nwith a strong command of tools like CLion, IntelliJ and Pycharm and modern frameworks like Tailwind\nCSS, Pandas and more. A quick learner and natural problem solver, passionate about bridging hardware\nand software to create impactful,real-world applications. Known for clear communication, leadership,\nand a commitment to delivering high-quality results." },
            "experience.txt": { type: "file", content: "Freelance Web Developer & AI Enthusiast\n\nProfessional Projects | 2023 - Present\n- Website Project: Yuva Global Enterprises (2025)\n  - Developed and deployed a website for a local business using HTML, CSS, and JavaScript on\n    InfinityFree's free hosting platform.\n  - Implemented responsive design principles to ensure optimal viewing across various devices.\n  - Configured DNS settings and managed domain-related issues, including addressing\n    accessibility challenges due to the hosting domain's reputation.\n  - Monitored site performance and uptime, ensuring consistent availability and swift load times.\n\nPersonal Projects | 2023 - Present\n- Developed this interactive online resume website:\n  - Designed and built a responsive, single-page application using HTML, Tailwind CSS, and\n    modern JavaScript.\n  - Focused on creating a clean, user-friendly interface to effectively showcase skills,\n    projects, and educational background." },
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

    const fileData = DirectoryContents.contents[InputFile];

    if (fileData) {
        if (fileData.type === "file") {
            OutputsText += `\n${fileData.content}\n\n`;
        } else if (fileData.type === "link") {
            OutputsText += `\nOpening link: ${fileData.content}\n`;
            if (fileData.description) {
                 OutputsText += `Description: ${fileData.description}\n\n`;
            } else {
                OutputsText += `\n`;
            }
            window.open(fileData.content);
        } else if (fileData.type === "executable") {
            OutputsText += `\n'${InputFile}' Started successfully\n\n`;
            DisplayPlasma = true;
        }
    }
    // Selected file dousnt exist
    else { OutputsText += `\nstart: '${InputFile}' No such file\n\n`; }
}

// Modified ExecuteCommand function
function ExecuteCommand() {
    const [Command, ...Arguments] = InputText.split(" ");

    if (Command) {
        // Assuming ComputerBeep is defined elsewhere, if not, this will cause an error.
        // ComputerBeep.play();
        // ComputerBeep.currentTime = 0;
    }

    switch (Command) {
        case "ls":
            if (Arguments.length) { OutputsText += "\nError: 'ls' doesn't accept any arguments\n\n"; }
            else { ListFiles(); }
            break;

        case "cd":
            if (Arguments.length > 1) { OutputsText += "\nError: 'cd' doesn't accept more that one argument\n\n"; }
            else if (!Arguments.length) { OutputsText += "\nError: 'cd' requires a directory argument\n\n"; }
            else { ChangeDirectory(Arguments[0]); }
            break;

        case "start":
            if (Arguments.length > 1) { OutputsText += "\nError: 'start' doesn't accept more that one argument\n\n"; }
            else if (!Arguments.length) { OutputsText += "\nError: 'start' requires a file argument\n\n"; }
            else { StartFile(Arguments[0]); }
            break;

        case "clear":
            if (Arguments.length) { OutputsText += "\nError: 'clear' doesn't accept any arguments\n\n"; }
            else { BootSequence(); } // This will clear most text and show boot sequence
            break;

        case "help":
            if (Arguments.length) { OutputsText += "\nError: 'help' doesn't accept any arguments\n\n"; }
            else { OutputsText += "\nPress 'tab' for auto complete and press 'esc' to exit\na program (.exe file)\n\nLS       Lists current directory contents\nCD       Change directory, '..' moves back, '/' to root\nSTART    Opens specified file or link in current directory\nCLEAR    Clears all previous terminal outputs\n\n"; }
            break;

        case "":
            break;

        default:
            OutputsText += `\nCommand not found '${Command}'\n\n`;
    }
}

// Autocomplete function
function AutoComplete() {
    const [Command, Argument1] = InputText.split(" "); // Use Argument1 to avoid redeclaring Arguments
    const CommandsList = ["ls", "cd", "start", "clear", "help"];

    // Auto completing a command
    if (InputText.split(" ").length === 1) {
        const CompletedCommand = CommandsList.filter(Element => Element.startsWith(Command));
        if (CompletedCommand.length === 1) { InputText = CompletedCommand[0] + " "; }
        else if (CompletedCommand.length > 1) {
            OutputsText += `\n${Directory}> ${InputText}\n`;
            OutputsText += CompletedCommand.join("  ") + "\n";
        }
    }

    // Auto comepleting a file name for 'cd' or 'start'
    else if (["cd", "start"].includes(Command) && InputText.split(" ").length === 2) {
        let DirectoryContents = FileSystem.root;
        for (let Dir of Directory.slice(15).split("/").filter(Boolean)) { DirectoryContents = DirectoryContents.contents[Dir]; }

        const PossibleCompletions = Object.keys(DirectoryContents.contents).filter(Item => Item.startsWith(Argument1));
        
        if (PossibleCompletions.length === 1) { InputText = `${Command} ${PossibleCompletions[0]}`; }
        else if (PossibleCompletions.length > 1) {
            OutputsText += `\n${Directory}> ${InputText}\n`;
            OutputsText += PossibleCompletions.join("  ") + "\n";
        }
    }
     Blinker.Index = InputText.length; // Ensure blinker is at the end after autocomplete
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
    // Assuming 'Time' is a global variable updated elsewhere (e.g., in a main loop)
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