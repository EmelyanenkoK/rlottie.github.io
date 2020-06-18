function htmlToElement(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
}

function loadLottie(url) {
    return new Promise((resolve, reject) => {
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.responseType = 'arraybuffer';
        xmlHttp.onreadystatechange = () => {
            if (xmlHttp.readyState === 4) {
                if (xmlHttp.status === 200) {
                    const arrayBuffer = xmlHttp.response;
                    const animationData = new TextDecoder('utf-8').decode(pako.inflate(arrayBuffer));
                    resolve(animationData);
                } else {
                    reject();
                }
            }
        };
        xmlHttp.open("GET", url, true);
        xmlHttp.send(null);
    });
}

const setupLottie = async i => {
    setTimeout(async () => {
        const n = 7;
        const json = await loadLottie('test/' + i + '.tgs')
        document.getElementById('w').appendChild(
            htmlToElement(`
                    <div class="content" id="content${i}">
      <canvas class="" id="myCanvas${i}" width="100" height="100" style="border:1px solid #dae1e7;"></canvas>
    </div>`)
        )

        newLottie('myCanvas' + i, 'content' + i, json);
    }, i * 500)
}

function setup() {
    var head = document.head;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'rlottie-wasm.js';
    head.appendChild(script);

    script.onload = _ => {
        Module.onRuntimeInitialized = _ => {
            for (let i = 0; i < 10; i++) {
                setupLottie(i)
            }
        };
    };
}

setup();


const newLottie = (canvasName, containerName, JSON) => {


// Create a LottieView Module responsible of rendering a lotti file
    var RLottieModule = (function () {
        // create a object;
        var obj = {};

        // object content.
        obj.Api = {};
        obj.canvas = {};
        obj.context = {};
        obj.lottieHandle = 0;
        obj.frameCount = 0;
        obj.curFrame = 0;
        obj.frameRate = 0;
        obj.rafId = {};
        obj.resizeId = {};
        obj.playing = true;
        obj.wasPlaying = false;

        // keep the api list
        function initApi() {
            obj.Api = {
                init: Module.cwrap('lottie_init', '', []),
                destroy: Module.cwrap('lottie_destroy', '', ['number']),
                resize: Module.cwrap('lottie_resize', '', ['number', 'number', 'number']),
                buffer: Module.cwrap('lottie_buffer', 'number', ['number']),
                frameCount: Module.cwrap('lottie_frame_count', 'number', ['number']),
                render: Module.cwrap('lottie_render', '', ['number', 'number']),
                loadFromData: Module.cwrap('lottie_load_from_data', 'number', ['number', 'number']),
            };
        }

        obj.init = function () {
            relayoutCanvas();
            initApi();
            obj.canvas = document.getElementById(canvasName);
            obj.context = obj.canvas.getContext('2d');

            obj.lottieHandle = obj.Api.init();
            obj.Api.resize(obj.lottieHandle, obj.canvas.width, obj.canvas.height);
            obj.frameCount = obj.Api.frameCount(obj.lottieHandle);
            // hook to the main loop
            mainLoop();
        }

        obj.render = function () {
            if (obj.canvas.width == 0 || obj.canvas.height == 0) return;

            obj.Api.resize(obj.lottieHandle, obj.canvas.width, obj.canvas.height);
            obj.Api.render(obj.lottieHandle, obj.curFrame++);
            var bufferPointer = obj.Api.buffer(obj.lottieHandle);
            var result = new Uint8ClampedArray(Module.HEAP8.buffer, bufferPointer, obj.canvas.width * obj.canvas.height * 4);
            var imageData = new ImageData(result, obj.canvas.width, obj.canvas.height);

            obj.context.putImageData(imageData, 0, 0);

            if (obj.curFrame >= obj.frameCount) obj.curFrame = 0;
        }

        obj.reload = function (jsString) {
            var lengthBytes = lengthBytesUTF8(jsString) + 1;
            var stringOnWasmHeap = _malloc(lengthBytes);
            stringToUTF8(jsString, stringOnWasmHeap, lengthBytes + 1);

            console.log("reload started");
            var len = obj.Api.loadFromData(obj.lottieHandle, stringOnWasmHeap);
            obj.frameCount = obj.Api.frameCount(obj.lottieHandle);
            obj.curFrame = 0;
            // force a render in pause state
            obj.update();
            //_free(stringOnWasmHeap); sometime it crashes need to find out why ??
            console.log("reload ended");
        }

        obj.update = function () {
            if (!obj.playing)
                window.requestAnimationFrame(obj.render);
        }

        obj.pause = function () {
            window.cancelAnimationFrame(obj.rafId);
            obj.playing = false;
        }

        obj.play = function () {
            obj.playing = true;
            mainLoop();
        }
        obj.isPlaying = function () {
            return obj.playing;
        }

        obj.seek = function (value) {
            obj.curFrame = value;
            window.requestAnimationFrame(obj.render);
        }

        function mainLoop() {
            obj.rafId = window.requestAnimationFrame(mainLoop);
            obj.render();
        }

        function relayoutCanvas() {
            var width = document.getElementById(containerName).clientWidth;
            var height = document.getElementById(containerName).clientHeight;
            var size = width;
            if (width < height)
                size = width;
            else
                size = height;
            size = size - 8;

            document.getElementById(canvasName).width = size;
            document.getElementById(canvasName).height = size;
        }

        function windowResizeDone() {
            relayoutCanvas();
            if (obj.wasPlaying) {
                obj.wasPlaying = false;
                obj.play();
            } else {
                obj.update();
            }
        }

        function windowResize() {
            if (obj.isPlaying()) {
                obj.wasPlaying = true;
                obj.pause();
            }
            clearTimeout(obj.resizeId);
            obj.resizeId = setTimeout(windowResizeDone, 150);
        }

        return obj;
    }());

    RLottieModule.init();
    RLottieModule.reload(JSON);
    RLottieModule.play();
}
