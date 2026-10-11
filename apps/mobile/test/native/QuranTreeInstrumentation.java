package ca.hbic.quranqa;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.graphics.Rect;
import android.os.Bundle;
import android.view.accessibility.AccessibilityNodeInfo;

/** Standalone emulator test package. It does not restart/instrument HBIC and
 * does not wait for a silent event stream while the real audio clock runs. */
public final class QuranTreeInstrumentation extends Instrumentation {
  @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }
  private String escape(CharSequence value) {
    return value == null ? "" : value.toString().replace("&", "&amp;").replace("\"", "&quot;")
      .replace("<", "&lt;").replace(">", "&gt;").replace("\n", "&#10;");
  }
  private void append(StringBuilder xml, AccessibilityNodeInfo node, int depth) {
    if (node == null || depth > 60) return;
    Rect bounds = new Rect(); node.getBoundsInScreen(bounds);
    xml.append("<node text=\"").append(escape(node.getText())).append("\" content-desc=\"")
      .append(escape(node.getContentDescription())).append("\" clickable=\"").append(node.isClickable())
      .append("\" checked=\"").append(node.isChecked()).append("\" enabled=\"").append(node.isEnabled())
      .append("\" bounds=\"[").append(bounds.left).append(',').append(bounds.top).append("][")
      .append(bounds.right).append(',').append(bounds.bottom).append("]\">");
    for (int i = 0; i < node.getChildCount(); i++) append(xml, node.getChild(i), depth + 1);
    xml.append("</node>");
  }
  @Override public void onStart() {
    Bundle result = new Bundle();
    try {
      UiAutomation ui = getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      AccessibilityNodeInfo root = ui.getRootInActiveWindow();
      for (int i = 0; root == null && i < 10; i++) { Thread.sleep(100); root = ui.getRootInActiveWindow(); }
      if (root == null) throw new IllegalStateException("No active accessibility window");
      StringBuilder xml = new StringBuilder("<hierarchy>"); append(xml, root, 0); xml.append("</hierarchy>");
      result.putString("hbic_tree", xml.toString()); finish(Activity.RESULT_OK, result);
    } catch (Exception failure) {
      result.putString("hbic_error", failure.getClass().getSimpleName()); finish(Activity.RESULT_CANCELED, result);
    }
  }
}
