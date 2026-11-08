declare module "*.md" {
  const slides: import("./deck/types").Slide[];
  export default slides;
}
