// toggle light/dark mode
const btnSwitch = document.getElementById("btn-switch")
btnSwitch.addEventListener("click",function(){
    if (document.documentElement.getAttribute("data-bs-theme") == "dark") {
        document.documentElement.setAttribute("data-bs-theme","light");
    }
    else {
        document.documentElement.setAttribute("data-bs-theme","dark");
    }
})

