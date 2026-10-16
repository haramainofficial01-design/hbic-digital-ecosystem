import assert from "node:assert/strict";
import test from "node:test";
import {desktopAppLayout} from "../src/components/desktopLayout";
import {macAppDestinations,macWindowLayout,selectedMacDestination} from "../src/components/macAppNavigation";
import {lightTheme,darkTheme} from "../src/theme/theme";
test("Mac layout reserves navigation space and bounds sections without changing other hosts",()=>{
  for(const width of[320,640,900,960,1280,1792,2560]){
    const mac=desktopAppLayout(width,true);
    assert.equal(mac.desktop,true);assert.equal(mac.topPadding,28);assert.equal(mac.maxWidth,1120);
    assert.equal(mac.columns,width>=960?2:1);
    assert.equal(desktopAppLayout(width,false).columns,1);
    assert.equal(desktopAppLayout(width,false).maxWidth,1080);
    assert.equal(desktopAppLayout(width,true,1.5).columns,1);
  }
  for(const width of[NaN,0,-5,Infinity])assert.equal(desktopAppLayout(width,true).desktop,false);
});

test("Mac navigation keeps a compact rail for narrow windows and large text",()=>{
  for(const width of[320,640,900,1059]) assert.deepEqual(macWindowLayout(width),{compact:true,sidebarWidth:76});
  for(const width of[1060,1280,1792]){
    assert.deepEqual(macWindowLayout(width),{compact:false,sidebarWidth:232});
    assert.deepEqual(macWindowLayout(width,1,true),{compact:true,sidebarWidth:76});
    assert.deepEqual(macWindowLayout(width,1.5),{compact:true,sidebarWidth:76});
  }
  for(const width of[NaN,Infinity]) assert.equal(macWindowLayout(width).compact,true);
  for(const fontScale of[NaN,Infinity]) assert.equal(macWindowLayout(1792,fontScale).compact,true);
  for(const destination of macAppDestinations) assert.equal(selectedMacDestination(destination.href),destination.href);
  assert.equal(selectedMacDestination("/quran/session"),"/quran");
  assert.equal(selectedMacDestination("/quran-academy"),"/quran-academy");
  assert.equal(selectedMacDestination("/notifications"),"/more");
  assert.equal(selectedMacDestination("/quranical"),"/more");
});

test("button and warning foregrounds retain readable contrast in both themes",()=>{
  function luminance(hex:string){const values=hex.slice(1).match(/../g)!.map(value=>{const c=parseInt(value,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return values[0]*.2126+values[1]*.7152+values[2]*.0722;}
  function contrast(a:string,b:string){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05);}
  for(const theme of[lightTheme,darkTheme]){
    assert.ok(contrast(theme.colors.onTint,theme.colors.tint)>=4.5,`${theme.mode} primary label`);
    assert.ok(contrast(theme.colors.onDanger,theme.colors.danger)>=4.5,`${theme.mode} danger label`);
    assert.ok(contrast(theme.colors.warningText,theme.colors.background)>=4.5,`${theme.mode} warning label`);
  }
});
