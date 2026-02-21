let mode = "none";

let assets_location = "assets/", assets_location_raw = "assets/";
if(window.location.href.includes("github")){
	assets_location_raw = "https://res.cloudinary.com/dmrey3haf/raw/upload/v1768114175/";
	assets_location = "https://res.cloudinary.com/dmrey3haf/image/upload/v1768114175/";
}

const min_photo_width = 400, max_photo_width = 500;

const instance_id = "?t=" + (new Date().getTime()).toString();

let photos = [], query, focus, descriptions = new Map();

function description(q){
	return descriptions.get(q) || descriptions.get("*") || "";
}

{
	const params = new URLSearchParams(document.location.search);
	query = params.get("q") || "featured";
	focus = (parseInt(params.get("f"))+1 || 0) -1;
};

function queried(i){
	if(i < 0 || i >= photos.length) return false;
	if(query == "all") return true;

	if(query[0] == '.') return i.toString() == query.slice(1);
	else return photos[i].tags.includes(query) || photos[i].tags.includes('!' + query);
}

fetch(assets_location_raw + "descriptions" + instance_id).then((res) => res.text()).then((t) => {
	{
		let block = "", key = [];

		for(let line of t.split('\n')){
			if(line.length && line[0] == '[' && line[line.length-1] == ']'){
				if(key.length) for(let k of key) descriptions.set(k.trim(), block.trim());
				key = line.slice(1, line.length-1).split(',');
				block = "";

			}else block += line + '\n';
		}

		if(key.length) for(let k of key) descriptions.set(k.trim(), block.trim());
	};

	fetch(assets_location_raw + "count" + instance_id).then((res) => res.text()).then((text) => {
		const count = parseInt(text);
		photos = new Array(count);

		let total = 0;

		for(let i=0; i<count; ++i){
			fetch(assets_location_raw + i.toString() + "_meta.json" + instance_id)
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

	// window.history.replaceState([query, focus], document.title, document.location.href);

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
	// window.history.pushState([query, focus], document.title, url);
	window.history.replaceState([query, focus], document.title, url);
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

function change_query(next_query, next_focus = -1, back_button = false){
	if(next_query == query) return;

	if(!back_button)
		window.history.replaceState([query, focus], document.title, document.location.href);

	query = next_query;
	focus = next_focus;
	mode = "none";

	const E0 = document.getElementById("text-column");

	if(E0){
		while(E0.lastChild) E0.removeChild(E0.lastChild);
		populate_caption(E0);
	}

	const E1 = document.getElementById("photo-column-1");
	const E2 = document.getElementById("photo-column-2");

	if(E1) E1.classList.add("fade-out");
	if(E2) E2.classList.add("fade-out");

	setTimeout(_ => {
		const E1 = document.getElementById("photo-column-1");
		const E2 = document.getElementById("photo-column-2");

		if(E1) while(E1.lastChild) E1.removeChild(E1.lastChild);
		if(E2) while(E2.lastChild) E2.removeChild(E2.lastChild);

		column_swap = false;
		window.scrollTo(0, 0);
		update_ui(document.body.clientWidth - scrollbar_width(), false);

		{
			const E1 = document.getElementById("photo-column-1");
			const E2 = document.getElementById("photo-column-2");

			if(E1) E1.classList.add("fade-out");
			if(E2) E2.classList.add("fade-out");

			requestAnimationFrame(_ => {
				if(E1) E1.classList.remove("fade-out");
				if(E2) E2.classList.remove("fade-out");
			});
		};
	}, 300);

	if(!back_button){
		let url = "?";
		if(query != "featured") url += "q=" + query;
		if(focus != -1) url += "&f=" + focus.toString();
		window.history.pushState([query, focus], document.title, url);
	}
}

window.addEventListener("popstate", (event) => {
	if(event.state && Array.isArray(event.state) && event.state.length == 2){
		if(query == event.state[0]){
			query = event.state[0], focus = event.state[1];
			update_ui();

		}else change_query(...event.state, true);
	}
});

function populate_caption(E){
	{
		const V = document.createElement("h2");

		if(focus != -1 || query[0] == "."){
			const I = focus == -1 ? parseInt(query.slice(1)) : focus;
			const T = document.createElement("a");
			T.textContent = photos[I].title.toUpperCase();

			if(query[0] == '.'){
				T.href = assets_location + I.toString() + "_fullres.jpg";
				T.target = "_blank";

			}else{
				T.onclick = e => {
					change_query('.' + I.toString());
					e.preventDefault();
				}

				T.href = "?q=." + I.toString();
			}

			V.appendChild(T);

		}else if(query == "all") V.textContent = "ALL PHOTOS";
		else if(query == "featured") V.textContent = "FEATURED";
		else V.textContent = "PHOTOS IN \"" + query.toUpperCase() + "\"";

		E.appendChild(V);
	};

	if(query[0] == "." || focus != -1){
		const V = document.createElement("p");
		const I = focus == -1 ? parseInt(query.slice(1)) : focus;

		V.textContent = (photos[I].settings.length ? photos[I].settings + " · " : "") + photos[I].date
		V.classList.add("small");

		E.appendChild(V);

	}else if(focus == -1){
		const V = document.createElement("p");

		const T = document.createElement("a");

		if(query == "featured"){
			T.textContent = "SEE ALL PHOTOS";

			T.onclick = e => {
				change_query("all");
				e.preventDefault();
			};

			T.href = "?q=all";

		}else{
			T.textContent = "SEE FEATURED PHOTOS";

			T.onclick = e => {
				change_query("featured");
				e.preventDefault();
			};

			T.href = "?";
		}

		V.appendChild(T);

		V.classList.add("small");

		E.appendChild(V);
	}

	{
		let caption = description(query);

		if(query[0] == '.') caption = photos[parseInt(query.slice(1))].caption;
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

	if(query[0] == "." || focus != -1){
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

						T.onclick = e => {
							change_query(tag);
							e.preventDefault();
						};

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

	let new_mode, column = [0, 0, 0], margin = [0, 0];

	if(query[0] == '.' && width > max_photo_width*7/4){
		new_mode = 2;

		column[1] = Math.min(width/(11/4), max_photo_width);
		column[0] = column[1] * 3/4;
		column[1] = column[1] * 2;

		margin[0] = width-column[0]-column[1];

		margin[1] = margin[0] * 3/7;
		margin[0] = margin[0] * 4/7;

	}else if(width > min_photo_width*11/4){
		new_mode = 3;

		column[1] = Math.min(width/(11/4), max_photo_width);
		column[0] = column[1] * 3/4;
		column[2] = column[1];

		margin[0] = width-column[0]-column[1]-column[2];

		margin[1] = margin[0] * 3/7;
		margin[0] = margin[0] * 4/7;

	}else if(width > min_photo_width*7/4){
		new_mode = 2;

		column[1] = Math.min(width/(7/4), max_photo_width);
		column[0] = column[1] * 3/4;

		margin[0] = width-column[0]-column[1];

		margin[1] = margin[0] * 3/7;
		margin[0] = margin[0] * 4/7;

	}else{
		new_mode = 1;

		column[0] = Math.min(width, max_photo_width);

		margin[0] = width-column[0];

		margin[1] = margin[0]/2;
		margin[0] = margin[0]/2;
	}

	if(mode == new_mode){
		if([2, 3].includes(mode)){
			const E = document.getElementById("text-column");

			E.style.left = margin[0].toString() + "px";
			E.style.width = column[0].toString() + "px";

			while(E.lastChild) E.removeChild(E.lastChild);
			populate_caption(E);
		};

		if([2, 3].includes(mode)){
			const E = document.getElementById("photo-column-1");

			E.classList.remove("no-transform");
			if(focus != -1) E.classList.add("no-transform");

			E.style.left = (margin[0]+column[0]).toString() + "px";
			E.style.width = column[1].toString() + "px";
		};

		if([3].includes(mode)){
			const E = document.getElementById("photo-column-2");

			E.classList.remove("no-transform");
			if(focus != -1) E.classList.add("no-transform");

			E.style.left = (margin[0]+column[0]+column[1]).toString() + "px";
			E.style.width = column[2].toString() + "px";
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
				left: (margin[0]+column[0]).toString() + "px",
				width: (width-margin[0]-column[0]).toString() + "px",
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
			const E = document.getElementById("photo-column-1");

			E.classList.remove("no-transform");
			if(focus != -1) E.classList.add("no-transform");

			E.style.left = margin[0].toString() + "px";
			E.style.width = column[0].toString() + "px";
		}

		if(query[0] == '.'){
			const E = document.getElementById("photo-column-1");
			E.classList.add("no-transform");
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
				left: margin[0].toString() + "px",
				width: column[0].toString() + "px",
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
				left: (margin[0]+column[0]).toString() + "px",
				width: column[1].toString() + "px",
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
				left: (margin[0]+column[0]+column[1]).toString() + "px",
				width: column[2].toString() + "px",
			});

			document.body.appendChild(E);
		};

		if([1].includes(mode)){
			const E = document.createElement("div");
			E.id = "photo-column-1";

			Object.assign(E.style, {
				position: "absolute",
				top: "0px",
				left: margin[0].toString() + "px",
				width: column[0].toString() + "px",
				paddingLeft: "var(--margin)",
			});

			document.body.appendChild(E);
		}

		if(query[0] == '.'){
			const E = document.getElementById("photo-column-1");
			E.classList.add("no-transform");
		}

		if(focus != -1){
			const E = document.createElement("div");
			E.id = "backdrop";

			Object.assign(E.style, {
				position: 'fixed',
				top: '0px',
				left: (margin[0]+column[0]).toString() + "px",
				width: (column[1]+column[2]).toString() + "px",
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
				update_ui(false, true);

				if(focus != -1){
					const E = document.getElementById("photo-item-" + focus.toString());
					if(E){
						E.scrollIntoView();
						window.scrollBy(0, -50);
					}
				}
			}
		}

		{
			const suffix = query[0] == '.' ? "_fullres.jpg" : "_scaled.jpg";

			if([1].includes(mode)){
				const E1 = document.getElementById("photo-column-1");

				for(let i=photos.length-1; i>=0; --i){
					if(!queried(i)) continue;

					const V = document.createElement("img");
					V.src = assets_location + i.toString() + suffix;
					V.id = "photo-item-" + i.toString();
					V.loading = "lazy";

					if(![-1, i].includes(focus)) V.style.opacity = 0.15;
					if(W) V.onload = load_inc;

					E.appendChild(V);
				}
			}

			if([2].includes(mode)){
				const E = document.getElementById("photo-column-1");

				for(let i=photos.length-1; i>=0; --i){
					if(!queried(i)) continue;

					const V = document.createElement("img");
					V.src = assets_location + i.toString() + suffix;
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
					V.src = assets_location + i.toString() + "_fullres.jpg";
					V.id = "photo-item-" + i.toString();
					V.loading = "lazy";

					if(![-1, i].includes(focus)) V.style.opacity = 0.15;
					if(W) V.onload = load_inc;

					V.onclick = _ => refocus(i);

					const height = column[1] * photos[i].dimensions[1]/photos[i].dimensions[0];

					if(h1 <= h2) E1.appendChild(V), h1 += height;
					else E2.appendChild(V), h2 += height;
				}

				// TODO also display descriptions, tags, etc
			}
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
			E1.style.transform = "translate(" + column[2].toString() + "px, 0)";
			E2.style.transform = "translate(-" + column[1].toString() + "px, 0)";

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
