const marker = "// HBIC scene-sized native tab controller";
const anchor = "#pragma mark - UIView methods\n";

/** Keep the embedded native tab controller within its own scene-sized host. */
function patchIosNativeTabsLayout(source) {
  if (source.includes(marker)) return source;
  if (source.split(anchor).length !== 2 || /-\s*\(void\)layoutSubviews\b/.test(source)) {
    throw new Error("HBIC native-tabs geometry patch does not match the installed screens source.");
  }
  return source.replace(anchor, `${anchor}
${marker}
- (void)layoutSubviews
{
  [super layoutSubviews];
  if (_controller != nil && !CGRectEqualToRect(_controller.view.frame, self.bounds)) {
    _controller.view.frame = self.bounds;
  }
}
`);
}

module.exports = { patchIosNativeTabsLayout };
