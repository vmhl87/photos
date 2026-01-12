let mode = "none";

let assets_location = "assets/", assets_location_raw = "assets/";
if(window.location.href.includes("github")){
	assets_location_raw = "https://res.cloudinary.com/dmrey3haf/raw/upload/v1768114175/";
	assets_location = "https://res.cloudinary.com/dmrey3haf/image/upload/v1768114175/";
}

const min_photo_width = 400, max_photo_width = 500;

let photos = [], query, focus, bio = "";

{
	const params = new URLSearchParams(document.location.search);
	query = params.get("q") || "featured";
	focus = (parseInt(params.get("f"))+1 || 0) -1;
};

function queried(i){
	if(i < 0 || i >= photos.length) return false;
	if(query == "all") return true;

	if(query[0] == '#') return i.toString() == query.slice(1);
	else return photos[i].tags.includes(query) || photos[i].tags.includes('!' + query);
}

fetch("src/bio.txt").then((res) => res.text()).then((t) => {
	bio = t;

	fetch(assets_location_raw + "count?t=" + new Date().getTime()).then((res) => res.text()).then((text) => {
		const count = parseInt(text);
		photos = new Array(count);

		let total = 0;

		for(let i=0; i<count; ++i){
			fetch(assets_location_raw + i.toString() + "_meta.json?t=" + new Date().getTime())
				.then((res) => res.text()).then((_text) => {
					photos[i] = JSON.parse(_text);

					++total;
					if(total == count){
						update_ui(document.body.clientWidth - scrollbar_width());
						window.onresize = _ => {
							update_ui(false, true);
							if(focus != -1) recheck_focus();
						}
					}
				});
		}
	});
});

function scrollbar_width() {
	const scrollDiv = document.createElement('div');

	scrollDiv.style.overflowY = 'scroll';
	scrollDiv.style.width = '50px';
	scrollDiv.style.height = '50px';
	scrollDiv.style.visibility = 'hidden';
	scrollDiv.style.position = 'absolute';

	document.body.appendChild(scrollDiv);

	const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

	document.body.removeChild(scrollDiv);

	return scrollbarWidth;
}

let manual_scroll_trip = false;

function refocus(i){
	if(i == focus && i != -1) i = -1;
	else if(i == focus) return;

	window.history.replaceState([query, focus], document.title, document.location.href);

	focus = i;
	update_ui();

	if(focus != -1){
		const E = document.getElementById("photo-item-" + focus.toString());

		const target = Math.min(
			Math.max(E.getBoundingClientRect().top + window.pageYOffset - 50, 0),
			Math.max(
				document.body.scrollHeight,
				document.body.offsetHeight,
				document.documentElement.clientHeight,
				document.documentElement.scrollHeight,
				document.documentElement.offsetHeight
			) - window.innerHeight);

		const start = window.pageYOffset;
		const distance = target - start;
		let T = null;

		manual_scroll_trip = false;

		function animation(now) {
			if(T === null) T = now;

			const F = Math.min((now-T) / 750, 1);

			function B(x1, y1, x2, y2, f) {
				if(f <= 0) return 0;
				if(f >= 1) return 1;

				const sample = (t, p1, p2) => {
					return 3*Math.pow(1-t, 2)*t*p1 + 3*(1-t)*Math.pow(t, 2)*p2 + Math.pow(t, 3);
				};

				const derivative = (t, p1, p2) => {
					return 3*Math.pow(1-t, 2)*p1 + 6*(1-t)*t*(p2-p1) + 3*Math.pow(t, 2)*(1-p2);
				};

				let t = f;
				for(let i=0; i<8; ++i){
					const C = sample(t, x1, x2) - f;
					const D = derivative(t, x1, x2);

					if (Math.abs(C) < 1e-7) break;
					if (Math.abs(D) < 1e-7) break;

					t -= C/D;
				}

				return sample(t, y1, y2);
			}

			window.scrollTo(0, start + (distance * B(0.25, 0.1, 0.25, 1, F)));

			if(now-T < 750 && !manual_scroll_trip) requestAnimationFrame(animation);
		}

		requestAnimationFrame(animation);
	}

	let url = "?";
	if(query != "featured") url += "q=" + query;
	if(focus != -1) url += "&f=" + focus.toString();
	window.history.pushState([query, focus], document.title, url);
}

window.addEventListener("wheel", (event) => {
	manual_scroll_trip = true;

	if(focus == -1) return;

	recheck_focus();
});

function recheck_focus(){
	const E = document.getElementById("photo-item-" + focus.toString());

	if(E){
		const rect = E.getBoundingClientRect();
		if(rect.bottom < 0+200 || rect.top > window.innerHeight-200) refocus(-1);
	}
}

window.addEventListener("popstate", (event) => {
	if(event.state && Array.isArray(event.state) && event.state.length == 2){
		query = event.state[0], focus = event.state[1];
		update_ui();
	}
});

function populate_caption(E){
	{
		const V = document.createElement("h2");

		if(focus != -1 || query[0] == "#"){
			const I = focus == -1 ? parseInt(query.slice(1)) : focus;
			const T = document.createElement("a");
			T.textContent = photos[I].title.toUpperCase();
			T.href = assets_location + I.toString() + "_fullres.jpg";
			T.target = "_blank";
			V.appendChild(T);

		}else if(query == "all") V.textContent = "ALL PHOTOS";
		else if(query == "featured") V.textContent = "FEATURED";
		else V.textContent = "PHOTOS TAGGED \"" + query.toUpperCase() + "\"";

		E.appendChild(V);
	};

	if(query[0] == "#" || focus != -1){
		const V = document.createElement("p");
		const I = focus == -1 ? parseInt(query.slice(1)) : focus;

		V.textContent = (photos[I].settings.length ? photos[I].settings + " · " : "") + photos[I].date
		V.classList.add("small");

		E.appendChild(V);

	}else if(focus == -1){
		const V = document.createElement("p");

		const T = document.createElement("a");

		if(query == "all"){
			T.textContent = "SEE FEATURED PHOTOS";
			T.href = "?";

		}else{
			T.textContent = "SEE ALL PHOTOS";
			T.href = "?q=all";
		}

		V.appendChild(T);

		V.classList.add("small");

		E.appendChild(V);
	}

	{
		let caption = bio;

		if(query[0] == '#') caption = photos[parseInt(query.slice(1))].caption;
		if(focus != -1) caption = photos[focus].caption;

		const lines = caption.split('\n');

		let section = "";

		function push(){
			const V = document.createElement("p");
			V.textContent = section;
			E.appendChild(V);

			section = "";
		}

		for(let line of lines)
			if(line.length) section += line + '\n';
			else push();

		if(section.length) push();
	};

	if(query[0] == "#" || focus != -1){
		const I = focus == -1 ? parseInt(query.slice(1)) : focus;

		let tags = 0;
		for(let tag of photos[I].tags)
			if(tag.length && tag != "featured" && tag[0] != '!') ++tags;

		const V = document.createElement("p");
		V.classList.add("small2");

		if(tags){
			{
				const T = document.createElement("text");
				T.textContent = "tags: ";
				V.appendChild(T);
			};
			let first = 1;

			for(let tag of photos[I].tags)
				if(tag.length && tag != "featured" && tag[0] != '!'){
					if(!first){
						const T = document.createElement("text");
						T.textContent = ", ";
						V.appendChild(T);
					};
					{
						const T = document.createElement("a");
						T.textContent = tag;
						T.href = "?q=" + tag;
						V.appendChild(T);
					};
					first = 0;
				}
		}

		E.appendChild(V);
	}
}

let column_swap = false;

function update_ui(W = false, R = false){
	const width = W || document.body.clientWidth;

	let new_mode, column_width, margin_left;

	if(width > min_photo_width*11/4){
		new_mode = 3;
		column_width = Math.min(width*4/11, max_photo_width);
		margin_left = (width-column_width*11/4) * 4/7;

	}else if(width > min_photo_width*7/4){
		new_mode = 2;
		column_width = Math.min(width*4/7, max_photo_width);
		margin_left = (width-column_width*7/4) * 4/7;

	}else{
		new_mode = 1;
		column_width = Math.min(width, max_photo_width);
		margin_left = (width-column_width)/2;
	}

	if(mode == new_mode){
		if([2, 3].includes(mode)){
			const E = document.getElementById("text-column");

			E.style.left = margin_left.toString() + "px";
			E.style.width = (column_width*3/4).toString() + "px";

			while(E.lastChild) E.removeChild(E.lastChild);
			populate_caption(E);
		};

		if([2, 3].includes(mode)){
			const E = document.getElementById("photo-column-1");

			E.classList.remove("no-transform");
			if(focus != -1) E.classList.add("no-transform");

			E.style.left = (margin_left+column_width*3/4).toString() + "px";
			E.style.width = column_width.toString() + "px";
		};

		if([3].includes(mode)){
			const E = document.getElementById("photo-column-2");

			E.classList.remove("no-transform");
			if(focus != -1) E.classList.add("no-transform");

			E.style.left = (margin_left+column_width*7/4).toString() + "px";
			E.style.width = column_width.toString() + "px";
		};

		{
			const E = document.getElementById("backdrop");
			if(E) document.body.removeChild(E);
		};

		if(focus != -1){
			const E = document.createElement("div");
			E.id = "backdrop";

			Object.assign(E.style, {
				position: 'fixed',
				top: '0px',
				left: (margin_left+column_width*3/4).toString() + "px",
				width: (width-margin_left-column_width*3/4).toString() + "px",
				height: "100%",
			});

			E.onclick = _ => refocus(-1);

			document.body.appendChild(E);
		}

		for(let i=0; i<photos.length; ++i){
			if(!queried(i)) continue;

			const E = document.getElementById("photo-item-" + i.toString());

			if(E){
				if(![-1, i].includes(focus)) E.style.opacity = 0.15;
				else E.style.opacity = 1;
			}
		}

		if([1].includes(mode)){
			// TODO
			document.body.innerHTML = `<div style="margin:0;padding:0;width:100%;height:100%;">
				<p style="color:#666;z-index:1000;position:fixed;top:50%;left:calc(50% - 200px);transform:translate(calc(-50% + 200px), -100%);">
					This site doesn't work<br>on mobile yet. Sorry!
				</p>
			</div>`;
		}

	}else{
		if(mode != "none") focus = -1;
		mode = new_mode;

		while(document.body.lastChild) document.body.removeChild(document.body.lastChild);

		if([2, 3].includes(mode)){
			const E = document.createElement("div");
			E.id = "text-column";

			Object.assign(E.style, {
				position: 'fixed',
				top: '0px',
				left: margin_left.toString() + "px",
				width: (column_width*3/4).toString() + "px",
				zIndex: "1000",
			});

			populate_caption(E);

			document.body.appendChild(E);
		};

		if([2, 3].includes(mode)){
			const E = document.createElement("div");
			E.id = "photo-column-1";

			if(focus != -1) E.classList.add("no-transform");

			Object.assign(E.style, {
				position: "absolute",
				top: "0px",
				left: (margin_left+column_width*3/4).toString() + "px",
				width: column_width.toString() + "px",
			});

			document.body.appendChild(E);
		};

		if([3].includes(mode)){
			const E = document.createElement("div");
			E.id = "photo-column-2";

			if(focus != -1) E.classList.add("no-transform");

			Object.assign(E.style, {
				position: "absolute",
				top: "0px",
				left: (margin_left+column_width*7/4).toString() + "px",
				width: column_width.toString() + "px",
			});

			document.body.appendChild(E);
		};

		if(focus != -1){
			const E = document.createElement("div");
			E.id = "backdrop";

			Object.assign(E.style, {
				position: 'fixed',
				top: '0px',
				left: (margin_left+column_width*3/4).toString() + "px",
				width: (column_width*2).toString() + "px",
				height: "100%",
			});

			E.onclick = _ => refocus(-1);

			document.body.appendChild(E);
		}

		let loaded_count = 0, expected_count = 0;

		for(let i in photos)
			if(queried(i)) ++expected_count;

		function load_inc(){
			loaded_count += 1;
			if(loaded_count == expected_count){
				if(focus != -1){
					const E = document.getElementById("photo-item-" + focus.toString());
					if(E){
						E.scrollIntoView();
						window.scrollBy(0, -50);
					}
				}
			}
		}

		if([2].includes(mode)){
			const E = document.getElementById("photo-column-1");

			for(let i=photos.length-1; i>=0; --i){
				if(!queried(i)) continue;

				const V = document.createElement("img");
				V.src = assets_location + i.toString() + "_scaled.jpg";
				V.id = "photo-item-" + i.toString();
				V.loading = "lazy";

				if(![-1, i].includes(focus)) V.style.opacity = 0.15;
				if(W) V.onload = load_inc;

				V.onclick = _ => refocus(i);

				E.appendChild(V);
			}
		}

		if([3].includes(mode)){
			const E1 = document.getElementById("photo-column-1");
			const E2 = document.getElementById("photo-column-2");

			let h1 = 0, h2 = 0;

			for(let i=photos.length-1; i>=0; --i){
				if(!queried(i)) continue;

				const V = document.createElement("img");
				V.src = assets_location + i.toString() + "_scaled.jpg";
				V.id = "photo-item-" + i.toString();
				V.loading = "lazy";

				if(![-1, i].includes(focus)) V.style.opacity = 0.15;
				if(W) V.onload = load_inc;

				V.onclick = _ => refocus(i);

				const height = column_width * photos[i].dimensions[1]/photos[i].dimensions[0];

				if(h1 <= h2) E1.appendChild(V), h1 += height;
				else E2.appendChild(V), h2 += height;
			}
		}

		if([1].includes(mode)){
			// TODO
			document.body.innerHTML = `<div style="margin:0;padding:0;width:100%;height:100%;">
				<p style="color:#666;z-index:1000;position:fixed;top:50%;left:calc(50% - 200px);transform:translate(calc(-50% + 200px), -100%);">
					This site doesn't work<br>on mobile yet. Sorry!
				</p>
			</div>`;

		}
	}

	if(mode == 3){
		const E1 = document.getElementById("photo-column-1");
		const E2 = document.getElementById("photo-column-2");

		if(focus != -1){
			const E = document.getElementById("photo-item-" + focus.toString());
			column_swap = E.parentElement.id == "photo-column-2";
		}

		if(R){
			E1.classList.add("no-swap");
			E2.classList.add("no-swap");
		}

		if(column_swap){
			E1.style.transform = "translate(" + column_width.toString() + "px, 0)";
			E2.style.transform = "translate(-" + column_width.toString() + "px, 0)";

		}else{
			E1.style.transform = "translate(0, 0)";
			E2.style.transform = "translate(0, 0)";
		}

		if(R){
			function rem(){
				E1.classList.remove("no-swap");
				E2.classList.remove("no-swap");
			}

			requestAnimationFrame(rem);
		}

	}else column_swap = false;
}
