from pathlib import Path
import json,html
p=Path('archive/design/ux-audit-v023')
raw=json.loads((p/'records.json').read_text(encoding='utf8'))
r=list({x['file']:x for x in raw if 'file'in x}.values())
findings=[
('优先修正','设置说明已落后于界面','外观设置仍写“首页网速固定分段条”；显示内容仍写“辅助资料按需展开”。当前首页网速已是波浪线，辅助资料也直接展示。','统一改成实际行为描述；资料密度若只影响间距，应改名或与卡片密度合并。推荐显示按钮说明应明确哪些选项被改变。','desktop-extra-11.png','mobile-30.png'),
('优先优化','手机表格首屏看不到关键网络指标','390px 视口中表格可视宽度约 356px，默认内容约 622px；名称、独立状态列占去大半，延迟需要横向滚动。工具栏地区名称还会缩成“德…”。','手机将状态并入名称列；默认只保留名称、CPU、延迟，网速/费用由预设切换。地区与视图放第一行，排序与显示列放第二行；保留横滑渐隐并增加首次操作提示。','mobile-06.png','mobile-extra-3.png'),
('优先优化','首页缺少一步查看离线节点的入口','总览明确显示“1 个离线”，但不是筛选按钮。当前公开浏览入口提供地区、系统、搜索，却没有直接的在线/离线切换。','把在线数、离线数做成筛选入口，选中后显示筛选标签与清除按钮。桌面放在总览，手机也保持一触即达。','desktop-01.png','mobile-01.png'),
('优先优化','移动端资源工具栏缺少可见名称','资源页将“资源/延迟”和指标选择压成图标；延迟页却显示文字。相邻页面规则不一致，新用户难以辨认第三个滑杆图标的用途。','资源页也使用两行工具栏：第一行“资源 / 延迟 + CPU ▾ + 刷新”，第二行时间范围。当前指标始终可见，所有高频点击区域建议至少44px。','mobile-extra-17.png','mobile-final-7.png'),
('优先优化','多线路时第四条曲线没有直接图例','四条线路同时显示，但页面只列前三条，第四格是“已选4/4条线路”。用户必须打开线路菜单才能确认第四种颜色代表谁。','桌面允许图例全部换行；手机默认两行并提供“展开其余线路”，展开后每条都显示色标和名称。保留当前实线与颜色区分方案。','desktop-extra-21.png','mobile-extra-21.png'),
('优先优化','缩放后丢包显示横杠，原因藏得较深','缩放时间范围后丢包汇总变成“—”；统计说明解释了缺少样本数，但仅看指标容易理解成没有丢包或加载失败。','保留诚实的空值；在该位置显示“范围内暂不可统计”或可点说明，不用0%代替。统计摘要明确标注“当前线路”，与底部丢包选择器同步提示。','mobile-extra-25.png','desktop-extra-25.png'),
('常规优化','首页卡片的辅助信息仍偏密','资源、网速、连接数、账期、线路和价格都在同一卡片，辅助标签普遍较小；开启备注和多线路后手机需要更多滚动。','保留现有资源2×2和账期两列结构；主要数值14–16px，辅助说明尽量12px。TCP/UDP继续紧凑，备注留底部；1–3个短标签可居中，多标签自动左对齐换行。','desktop-extra-14.png','mobile-extra-14.png'),
('常规优化','手机首页摘要挤压节点首屏空间','手机总览使用四格摘要，节点卡片开始位置较靠下；用户查看多个节点要持续长距离滚动。','保留默认摘要，提供“收起总览”并记住偏好；收起后只显示在线/总数、实时网速和异常数。不要通过继续缩小字号换取空间。','mobile-01.png','mobile-extra-30.png'),
('常规优化','设置选项的设备作用域不够直观','手机也看到“桌面列数”和“首页地图”，但手机首页不显示地图；“外观设置”名称也覆盖不了网络阈值及偏好管理。','入口改为“显示与偏好”；桌面专属选项加“仅桌面生效”。背景与玻璃效果放高级折叠区，卡片密度与资料密度合并或说明差异。','mobile-29.png','mobile-37.png'),
('常规优化','手机搜索面板遮住即时结果','输入后背景结果会变化，但仍被模态遮罩覆盖；面板只显示匹配数量，需要额外关闭才能浏览。','输入框下增加“查看 N 个结果”按钮，回车关闭面板并定位结果列表；零结果时提供清空搜索。桌面维持现有内联搜索。','mobile-extra-1.png','mobile-extra-2.png'),
('常规优化','地图的操作提示难以发现','缩放、适配和全屏都有入口，但拖拽、Ctrl滚轮的提示不是常驻可发现入口；小地区对新用户也不容易定位。','桌面增加轻量“操作说明”图标和选中地区摘要；始终保留地区按钮作为地图替代入口。手机继续采用地区抽屉，无须强行塞入世界地图。','desktop-37.png','mobile-04.png'),
('常规优化','时间缩放手柄的辅助标签缺少有效值','浏览器实际读到手柄标签“Min value: undefined, Max value: undefined”，没有可理解的中文起止时间。','将两个手柄分别命名“开始时间/结束时间”，aria-valuetext使用可读日期时间，并验证键盘方向键。保留手机44px手柄命中区域。','mobile-extra-25.png','desktop-extra-25.png'),
('常规优化','高负载“记录”容易被当成服务端告警日志','记录说明完整，但在弹窗内；首页“高负载提示”不能直接让用户知道只记录当前浏览器打开期间的观测。','标题或副标题标“本机观测记录”，规则说明保持折叠；有真实服务端告警时再提供独立入口，不混用两类记录。','desktop-extra-15.png','mobile-extra-15.png'),
('细节优化','空态缺少更具体的下一步','取消全部线路会显示未选择探测；无历史与不存在节点也有文案，但恢复路径仍偏基础。','未选择线路增加“选择线路”按钮；无历史提供切换时间范围/刷新；不存在节点保留返回总览。不要将未知、缺失、超时统一显示成零。','desktop-48.png','mobile-extra-29.png'),
]
def note(x):
 t=x['title'];m=x['device']=='mobile'
 rules=[
 ('登录后台','已点击登录入口；本地演示服务未提供 /admin/，返回 Not found。只能验证入口，不能据此判定正式站登录有故障。'),
 ('无效地址','无效背景地址被拒绝并显示提示。建议把错误提示紧贴输入框，保留当前正常背景。'),
 ('错误文件','非法 JSON 导入被拒绝并显示说明。现有保护可保留，建议给出可用配置文件的示例。'),
 ('非法阈值','黄色高于红色时禁止应用并给出规则；手机错误信息可能位于下方，建议输入框旁同步显示。'),
 ('有效自定义','有效阈值可应用；作用仅为前端视觉分档。保持这一提示，避免用户误认为更改了服务端告警。'),
 ('自动同步','前台等待32秒，捕获到一次额外历史请求；证明本地轮询触发，不代表真实后端数据到达时延已验证。'),
 ('刷新失败','模拟503后保留上次曲线并提示失败，恢复路径可见。建议将“最后成功时间”与失败状态保持相邻。'),
 ('空历史','模拟空历史；缺少数据使用空态而非假曲线。可补“换个时间范围”操作。'),
 ('取消全部','取消全部线路后出现明确空态。建议增加“选择线路”按钮直接恢复。'),
 ('隐藏一条','点击图例可隐藏对应曲线；保留勾选状态与颜色标记，避免用删除线表达隐藏。'),
 ('多线路','多线路曲线以实线和不同颜色区分；超过三条时应把其余线路名称直接呈现或允许展开。'),
 ('全部线路','首页可直接进入详情多线路视图；建议让每条可见曲线都有对应可见图例。'),
 ('查找','线路菜单可查找名称；手机建议避免菜单触发后产生明显滚动跳转，可改底部抽屉。'),
 ('缩放','拖动手柄可缩放，恢复入口可见；缩放后的丢包横杠需要就近解释，手柄辅助标签应修正。'),
 ('恢复时间','恢复按钮可以回到完整时间范围。建议保留明确按钮，不只依赖双击手势。'),
 ('丢包','丢包线路和采样滑块可操作；建议使所选线路与上方摘要的对应关系更明显。'),
 ('统计说明','统计口径集中放入说明弹层，主图较清爽。保留说明，同时将影响当前数值的异常原因就近呈现。'),
 ('平滑','时间与平滑开关可操作。应继续强调只改变曲线显示，不更改原始数据；演示接口所有时间窗返回同一套样本。'),
 ('资源时间','时间按钮可切换；演示接口固定返回60个样本，无法由本次截图验证真实1h/6h/24h/7d覆盖范围。'),
 ('资源网速','上下行用不同颜色与图例区分，单位清楚。手机资源工具栏应保留文字和当前指标。'),
 ('资源图表','指标切换入口可用；建议资源页保持与延迟页一致的工具栏结构，手机避免纯图标。'),
 ('采样提示','图表采样提示可触发。手机需确保提示能关闭、不遮挡时间缩放与丢包轨道。'),
 ('tooltip','桌面悬停可查看采样。手机应通过点击/触控查看；本张悬停记录不作为真机触控证明。'),
 ('设备资料','资料分组可读，手机展开与复制IP有反馈；复制测试使用文档示例地址和浏览器授权环境。'),
 ('切换节点','节点选择器可打开，离线节点也可进入；建议较多节点时维持搜索和当前节点标记。'),
 ('离线','离线状态使用中性显示，实时资源以横杠表示。建议从总览离线数一键筛选到这些节点。'),
 ('完整节点资料','表格信息按钮可打开节点名称、系统与状态弹窗。保留完整名称查看入口，避免只依赖悬停title。'),
 ('表格进入','本张捕获到进入详情后的加载骨架；后续详情截图完成加载。保留骨架有助于感知反馈，但这不是加载失败证据。'),
 ('表格','表格可切换预设、显示列和排序。'+('手机名称与独立状态列占用较多空间，建议合并状态、分两行放筛选工具，并增强横向滑动提示。' if m else '桌面比较效率较高，保留列预设；建议常用排序就近展示，减少长下拉列表。')),
 ('搜索','搜索按输入过滤节点，空结果有恢复入口。'+('手机面板遮罩挡住结果，建议回车收起或提供“查看结果”。' if m else '桌面内联搜索直观，建议保留即时过滤和一键清空。')),
 ('地区','地区筛选可达。'+('底部抽屉容易触达，但进入表格后地区名称被压缩，建议与排序分行。' if m else '地区与数量直观，较多地区时应提供明显横滑或更多入口。')),
 ('系统筛选','已用Windows/Linux两类系统补测筛选；Ubuntu与Debian同属Linux，不能据此判断筛选入口缺失。手机可用“所有系统”恢复。'),
 ('高负载','记录弹窗及进入CPU历史的链路可用。补充数据触发92%高负载；有的截图停在加载骨架，后续网速图截图已完成加载。建议名称标明本机观测。'),
 ('背景','背景、玻璃和滑块设置可操作；高级选项较多，建议折叠并提供预览。'),
 ('地图','桌面地图缩放/适配/全屏/地区按钮/平移已操作；本次地区筛选使用底部按钮，未穷举地图每块国界。手机保持地区抽屉更适合。'),
 ('配色','六套配色均可切换并有选中反馈。建议保留当前色板，不继续增加主题数量；重点保证浅色与深色下辅助文字可读。'),
 ('指标样式','该指标样式能切换；建议默认继续使用细进度条，将圆环/分段/数字留作个人偏好。'),
 ('紧凑','紧凑模式和列数可调整。桌面四列更利于扫读；手机列数选项应说明仅桌面生效。'),
 ('精简','精简预设隐藏TCP/UDP与在线时长。建议在预设名称旁明确具体减少哪些信息。'),
 ('辅助信息全部','六项辅助信息可关闭；资源和延迟仍保留。建议提供一键回到默认显示以减少误操作恢复成本。'),
 ('隐藏容量','图标和容量说明可以关闭。建议图标默认开启，容量默认保留，避免关键语义过度依赖颜色。'),
 ('推荐显示','推荐按钮有反馈，但不会恢复所有辅助字段；建议按钮说明清楚，或提供明确的“恢复推荐卡片”。'),
 ('三线路首页','三线路显示提高比较能力，同时增加卡片高度。建议默认一条，三条作为网络用户的可选预设。'),
 ('首页线路独立','单节点线路可以独立选择；保留恢复全局入口，建议让独立选择状态更易辨认。'),
 ('设置-English','语言切换能即时生效；该截图只覆盖偏好页，不代表逐句完成英文翻译审校。'),
 ('导出与重新导入','成功导出JSON再导入；导出不包含节点或账号信息。建议名称改为“导出显示偏好”，涵盖网络设置。'),
 ('重置全部','重置入口及反馈可用，会清除浏览偏好。建议提供短暂撤销机会，避免与仅恢复外观混淆。'),
 ('恢复默认外观','恢复外观后有明确反馈，显示字段保留。建议将两种重置的区别放在按钮附近。'),
 ('设置-外观','配色、明暗、布局和背景聚集在一个长面板。建议将背景作为高级区域，修正分段条等过时说明。'),
 ('设置-显示','资料密度、完整/精简与逐字段选择互相叠加。建议合并重复概念，让用户先选预设再细调。'),
 ('设置-网络','线路和延迟阈值归组合理；需将“指示长度”等旧网速描述改为波浪线的实际含义。'),
 ('设置-偏好','导入、导出、恢复和语言功能集中且可操作。建议把总入口从“外观”改为“显示与偏好”。'),
 ('手机独立','手机可跟随通用或独立设置，功能有用；应标明此设置只保存在当前浏览器，不是跨设备同步。'),
 ('首页模块','开启地区/时钟/地图会增加总览高度；手机地图仍不显示。建议对仅桌面功能加作用域说明。'),
 ('不存在','不存在节点有返回列表入口。建议将空态做得更醒目，保持主操作按钮清晰。'),
 ('深色','深色配色可用。建议针对辅助文字、未选中图例和低对比度格线进行真机可读性复核。'),
 ('320px','320px下标题会截断，首屏空间紧张。建议优化布局与分行，而不是进一步缩小字体。'),
 ('返回','返回导航可操作；手机返回顶部已验证。建议保留详情返回总览位置和列表滚动恢复。'),
 ('顶部完整','延迟工具栏已采用两行且主要控件有44px命中区域。资源页应跟进相同规范。'),
 ('单线路','首页延迟数字可直达对应线路；建议确保锚点落位不被固定页头挡住，真实触控设备还需复核。'),
 ('外观说明','确认说明仍使用“分段条”等旧表述；应随本次视觉变更一起清理。'),
 ('首页','首页层级清楚，账期两列与网速波形方向正确。建议补异常筛选、改善辅助文字，并减少手机首屏总览占用。'),
 ('详情','详情主区域能展示资源、网络与账期。桌面可保持横向分组；手机优先突出当前节点和所选图表。'),
 ]
 for key,value in rules:
  if key in t:return value
 return '已进入并截图记录该状态。当前建议以保持信息层级和入口一致性为主，未从该截图确认独立功能故障。'
def category(t):
 if any(a in t for a in ['设置','偏好','阈值','配色','背景','说明文字','推荐显示','容量与图标','辅助信息','精简','紧凑','指标样式']):return '设置与外观'
 if '地图' in t:return '地图'
 if '表格' in t:return '表格'
 if any(a in t for a in ['延迟','线路','采样','资源','丢包','缩放','历史','设备','同步','切换节点','时间范围','tooltip']):return '节点详情与图表'
 if any(a in t for a in ['登录','不存在']):return '其他入口'
 return '首页与筛选'
for x in r:x['analysis']=note(x);x['category']=category(x['title'])
(p/'annotated-records.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf8')
count=lambda d:sum(x['device']==d for x in r)
intro=f'基于 Monitor HEX v0.1.23 本地生产构建，桌面1440×1000、手机390×844，并补充320px窄屏。共记录{len(r)}个截图状态（桌面{count("desktop")}、手机{count("mobile")}）。这是主题前台体验审查，未修改产品代码或发布。'
limits='演示服务器提供6个节点及固定历史数据；多线路、IP、到期、备注、高负载、空历史和503失败通过测试数据补充，不代表生产事故。登录后台不在演示服务中，真实登录/管理、服务端推送、实际网络时延、真机Safari/Android和全部设置组合未验证。长截图可能把固定页头绘入页面中段，这是截图方式影响，未作为界面缺陷；带“实际视口”的补图用于判断真实可见区域。'
md=['# Monitor HEX 桌面与手机体验审查','',intro,'',limits,'','## 建议执行顺序','', '1. 修正文案与设置语义；补充缩放后丢包空值解释。','2. 优化手机表格工具栏和默认列；统一手机资源/延迟工具栏。','3. 增加首页离线筛选，补齐多线路图例。','4. 再优化字号、总览折叠、地图提示、设置高级区域及无障碍标签。','','## 逐项建议','']
for i,(priority,title,obs,fix,a,b)in enumerate(findings,1):md += [f'### {i}. {title}（{priority}）','',f'观察：{obs}','',f'建议：{fix}','',f'[证据一]({a}) · [证据二]({b})','']
md+=['## 已体验范围与限制','','首页：默认卡片、在线/离线状态、搜索及空结果、地区抽屉/按钮、系统筛选、返回顶部、高负载记录与历史入口。','表格：进入、排序、概览/网络/费用预设、列选择、分组/独立列、横向滚动、节点资料弹窗和进入详情。','详情：切换节点、离线节点、资源四指标和四种时间范围、延迟入口/线路选择/查找/隐藏/取消全部、平滑、刷新、自动更新、统计说明、采样、时间缩放/恢复、丢包线路与采样、设备展开/IP复制。','设置：四分类、六配色、明暗、四指标样式、紧凑/桌面列数、容量/图标、辅助字段、手机独立设置、首页模块、推荐显示、网络阈值合法/非法、背景/玻璃、语言、导出/导入/错误文件、两类重置。','地图：桌面显示、放大/缩小、适配/复位、全屏/退出、地区按钮筛选和平移。手机使用地区抽屉。','其他：不存在节点、登录入口（后台未提供）。','','自动化定位失败的搜索、网络预设、网速指标、系统筛选已补测；桌面初始页面滚动不足520px时无返回顶部按钮，属于触发条件而非故障。未宣称穷举每个地区、每个节点、所有选项组合和全部后端功能。','','## 逐图记录','']
for x in r:md +=[f'### {x["device"]} · {x["title"]}','',f'[打开截图]({x["file"]})','',x['analysis'],'']
(p/'体验审查报告.md').write_text('\n'.join(md),encoding='utf8')
escape=html.escape
cards=''.join(f'<article class="capture" data-device="{x["device"]}" data-category="{escape(x["category"])}"><a href="{x["file"]}" target="_blank"><img loading="lazy" src="{x["file"]}" alt="{escape(x["title"])}"></a><div><small>{"桌面" if x["device"]=="desktop" else "手机"} · {escape(x["category"])}</small><h3>{escape(x["title"])}</h3><p>{escape(x["analysis"])}</p><a href="{x["file"]}" target="_blank">查看原图 ↗</a></div></article>'for x in r)
issues=''.join(f'<article class="finding"><span>{escape(pr)}</span><h3>{i:02d} · {escape(t)}</h3><p>{escape(o)}</p><p><b>建议：</b>{escape(f)}</p><a href="{a}" target="_blank">截图一 ↗</a> · <a href="{b}" target="_blank">截图二 ↗</a></article>'for i,(pr,t,o,f,a,b)in enumerate(findings,1))
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Monitor HEX · 桌面与手机体验审查</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f5f9;color:#263248;font:15px/1.75 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1280px;margin:auto;padding:48px 28px}h1{font-size:34px;line-height:1.35}h2{margin:45px 0 18px}h3{font-size:18px;margin:8px 0}p{margin:10px 0}a{color:#285fb2;text-decoration:none}header{padding:28px;background:#fff;border:1px solid #dce4ef;border-radius:18px}.tag{color:#43729c;font-weight:600}.muted{color:#63718a;font-size:13px}.findings{display:grid;grid-template-columns:1fr 1fr;gap:16px}.finding{background:#fff;border:1px solid #dce4ef;border-radius:14px;padding:22px}.finding>span{font-size:12px;color:#ac641e;background:#fff5e8;padding:4px 8px;border-radius:6px}.toolbar{position:sticky;top:0;z-index:2;display:flex;gap:10px;padding:15px;background:#f3f5f9f5;border-bottom:1px solid #dce4ef;flex-wrap:wrap}select,input{font:inherit;padding:9px;border:1px solid #ced8e5;border-radius:8px;max-width:100%}.gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.capture{background:white;border:1px solid #dce4ef;border-radius:12px;overflow:hidden}.capture>a{display:block;background:#e4e9f1}.capture img{display:block;width:100%;height:300px;object-fit:contain;object-position:top}.capture>div{padding:18px}.capture small{color:#63718a}.capture p{font-size:14px}.capture[hidden]{display:none}.good{padding:18px 24px;background:#e9f3f0;border-radius:12px;margin-top:20px}footer{color:#63718a;margin-top:50px}@media(max-width:850px){.gallery,.findings{grid-template-columns:1fr 1fr}}@media(max-width:560px){main{padding:18px 12px}.gallery,.findings{grid-template-columns:1fr}h1{font-size:25px}header{padding:18px}}</style><main><header><div class="tag">体验审查 · v0.1.23 · 2026-09-23</div><h1>让常用功能更容易找到，<br>让手机界面更容易读懂。</h1><p>INTRO</p><p class="muted">LIMITS</p><div class="good">主要路径可用：筛选、表格、详情、线路切换、缩放、复制、偏好导入导出均已操作。前台32秒观测到一次自动历史更新；失败时保留旧曲线。建议优先解决设置文案、手机表格、工具栏一致性与异常入口。</div></header><h2>14 项优化意见</h2><div class="findings">ISSUES</div><h2>逐页截图与分析</h2><p>每张图均有独立说明；点击可打开原图。默认显示全部，可按设备、区域或关键字筛选。</p><div class="toolbar"><select id="device"><option value="">全部设备</option><option value="desktop">桌面</option><option value="mobile">手机</option></select><select id="category"><option value="">全部区域</option>OPTIONS</select><input id="query" placeholder="搜索：表格、丢包、背景…"><span id="count"></span></div><div class="gallery">CARDS</div><footer>体验环境：本地Chrome浏览器与移动视口模拟。测试数据与访问记录见 records.json、evidence.json。截图不包含真实账号信息；示例IP使用文档专用地址。</footer></main><script>const els=[...document.querySelectorAll('.capture')];function filter(){let n=0;for(const e of els){const ok=(!device.value||e.dataset.device===device.value)&&(!category.value||e.dataset.category===category.value)&&e.textContent.toLowerCase().includes(query.value.toLowerCase());e.hidden=!ok;if(ok)n++}document.getElementById('count').textContent=n+' 张截图'}for(const id of ['device','category','query'])document.getElementById(id).addEventListener('input',filter);filter();</script></html>'''
page=page.replace('INTRO',escape(intro)).replace('LIMITS',escape(limits)).replace('ISSUES',issues).replace('OPTIONS',''.join(f'<option>{escape(c)}</option>'for c in sorted(set(x['category']for x in r)))).replace('CARDS',cards)
(p/'index.html').write_text(page,encoding='utf8')
print(intro)
