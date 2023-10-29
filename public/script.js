// switching between pages

const txtBtn = document.getElementById("txt-btn");
const docBtn = document.getElementById("doc-btn");
const webBtn = document.getElementById("web-btn");

txtBtn.onclick = () => {
    window.location.href = "/text";
}

docBtn.onclick = () => {
    window.location.href = "/document";
}

webBtn.onclick = () => {
    window.location.href = "/website";
}