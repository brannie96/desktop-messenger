function getCookie(name,object) {
    var value = "; " + object;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

user = getCookie("c_user",document.cookie);
ga('create', 'UA-61843189-2', 'auto');
if(user) {
    ga("set", "&uid", user);
}
ga('send', 'pageview');

