import qs from "qs";
import page from "page";
import { routes as show } from "./pages/show";
import { routes as index } from "./pages/index";

page("*", (ctx, next) => {
  ctx.teardown = () => {};
  ctx.query = qs.parse(ctx.querystring);
  next();
});

index();
show();
page();
