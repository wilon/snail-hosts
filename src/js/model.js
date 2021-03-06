/**
 * Created by sdm on 14-1-18.
 * Editor by Riant on 15-04-16
 * 数据存储类
 *
 * 使用 数据库 存储
 * 参考 http://www.webkit.org/demos/sticky-notes/index.html
 *     http://html5doctor.com/introducing-web-sql-databases/
 *
 *     这里使用
 *     localStorage 序列化存储
 *
 */

// Lang support
var lang = new Lang();
lang.dynamic('zh_CN', '/src/js/langpack/zh_CN.json');
lang.init({});

(function (window) {
    var model = {};

    //推荐的ip
    var ips = [];
    //字段提示的domain
    var domains = [];

    function uniq_arr(arr, key) {
        var dic = {}
        for (var i = 0; i < arr.length; i++) {
            var t = arr[i];
            dic[t[key]] = t;
        }
        var j = 0;
        arr.length = 0;
        for (var k in dic) {
            if (dic.hasOwnProperty(k)) {
                arr.push(dic[k]);
                j++;
            }
        }
        return arr;
    }

    function loadsIp() {
        var hosts = loadData('hosts');
        ips.splice(0, ips.length);
        for (var i in hosts) {
            ips.push({
                ip: hosts[i].ip
            });
            domains.push({
                domain: hosts[i].domain
            });
        }

        uniq_arr(ips, 'ip');
        uniq_arr(domains, 'domain');

        if (last_callback_ip) {
            last_callback_ip(ips);
        }
        if (last_callback_domain) {
            last_callback_domain(domains);
        }
    }
    //第一次加载
    loadsIp()

    var last_callback_ip = false;
    var last_callback_domain = false;

    model.setAutoIp = function (callback) {
        callback(ips);
        last_callback_ip = callback
    }
    model.setAutoDomain = function (callback) {
        callback(domains);
        last_callback_domain = callback
    }

    /**
     * 获取标签 有那些
     */
    model.getTags = function () {
        return loadData('tags');
    }


    //添加标签
    model.addTag = function (tagname, description) {
        var tags = model.getTags();
        tags[name] = {
            desc: description
        };
        saveData('tags', tags);
    }

    //删除标签
    model.removeTag = function (tagname) {
        var tags = model.getTags();
        delete tags[name];
    }

    //获取列表
    model.getHosts = function () {
        var result = []
        var hosts = loadData('hosts');
        for (var id in hosts) {
            if (hosts.hasOwnProperty(id)) {
                result.push(hosts[id]);
            }
        }
        return model.sortHostsResult(result);
    }

    model.getHostById = function (id) {
        var result = []
        var hosts = loadData('hosts');
        return hosts[id];
    }

    model.sortHostsResult = function (result) {
        return result.sort(function (x, y) {
            var a = Number(x.order),
                b = Number(y.order);
            return (isNaN(a) ? 1 : a) < (isNaN(b) ? 1 : b);
        });
    }

    //添加主机
    model.addHost = function (info, enable) {
        if (info.id) {
            model.updateHost(info);
        } else {
            var hosts = loadData('hosts');
            var c = loadData('hosts-count');
            if (!c) {
                c = 0;
            }
            if (!hosts) {
                hosts = {};
            }
            var id = 1 + c;
            info.status = 0;
            info.id = id;

            saveData('hosts-count', id);

            hosts[id] = info;

            saveData('hosts', hosts);

            loadsIp()
            if (enable) model.enableHosts([id]);
            model.reload();
        }
    }


    model.clearkws = function () {
        saveData('kws', [])

    }

    model.getkws = function () {
        var kws = loadData('kws');
        if (!kws) {
            kws = [];
        }
        return kws;
    }

    model.saveKw = function (kw) {
        var kws = loadData('kws');
        if (!kws || !kws.splice) {
            kws = [];
        }
        kws.splice(0, 0, kw);
        var kws2 = []
        var kw_map = {}
        for (var i = 0; i < kws.length; i++) {
            var kw = kws[i];
            if (!kw_map[kw]) {
                kws2.push(kw);
            }
            kw_map[kws[i]] = 1;
        }
        kws = kws2.slice(0, 10);

        saveData('kws', kws);
    }

    model.search = function (kw) {
        if (typeof kw !== 'string') kw = '';
        model.saveKw(kw);
        var hosts = model.getHosts().filter(function (host) {
            if (host.ip == '' || host.domain == '') return false;
            if (!kw) return true;
            var regStr = kw.toLowerCase().replace(/[\s]+/g, "(.*?)"),
                searchReg = new RegExp(regStr, 'ig'),
                hostArr = [host.ip, host.domain, JSON.stringify(host.tags)],
                isFilter = false;
            for (var i = 0; i < 6; i++) {
                var tmp = [0, 1, 2],
                    j = i % 2,
                    x = (i + j) % 3;
                tmp.splice(x, 1);
                var y = tmp[j],
                    z = 3 - x - y;
                var hostStr = hostArr[x] + hostArr[y] + hostArr[z];
                if (searchReg.test(hostStr)) {
                    isFilter = true;
                }
            }
            return isFilter;
        });
        hosts.sort(function (v1, v2) {
            return v1.id > v2.id ? -1 : 1;
        });
        return hosts;
    }

    /**
     * 获取标签的统计
     * @returns {Array}
     */
    model.countTags = function () {
        var tags = {};
        var hosts = loadData('hosts');
        var untag = 0;
        for (var i in hosts) {
            if (hosts.hasOwnProperty(i)) {
                var host = hosts[i];
                if (host.tags && host.tags.length) {
                    for (var x = 0; x < host.tags.length; x++) {
                        var tag = host.tags[x];
                        if (!tags[tag]) {
                            tags[tag] = 0;
                        }
                        tags[tag]++;
                    }
                } else {
                    untag++;
                }
            }
        }
        var result = []
        for (var i in tags) {
            if (tags.hasOwnProperty([i])) {
                result.push({
                    'name': i,
                    'count': tags[i]
                });
            }
        }
        if (untag) result.push({ name: '', count: untag });
        return result;
    }

    model.getStatus = function () {
        return loadData('status') ? loadData('status') : 0;
    }

    model.getEnabledHosts = function () {
        var results = [];
        var hosts = model.getHosts();
        //别名问题
        var map = {};
        var is_ip = new RegExp('([0-9]+\.)+[0-9]+');
        var is_hostname = new RegExp('([^\. ]+)'); //比如web1 web2 web-3 非域名
        //别名记录
        var host_alisa = {};
        var result_map = {};

        //分析别名
        $(hosts).each(function (i, v) {
            if (v.status == 1) {
                if (is_ip.test(v.ip) && is_hostname.test(v.domain)) {
                    host_alisa[v.domain] = v.ip + '[@]' + v.id;
                    result_map[v.domain] = v.ip + '[@]' + v.id;
                }
            }
        });

        $(hosts).each(function (i, v) {
            if (v.status == 1) {
                //使用了别名
                if (!is_ip.test(v.ip) && is_hostname.test(v.ip) && host_alisa[v.ip]) {
                    result_map[v.domain] = host_alisa[v.ip];
                } else if (is_ip.test(v.ip)) {
                    result_map[v.domain] = v.ip + '[@]' + v.id;
                } else {
                    console.log('err:', i, v)
                }
            }
        })

        for (var d in result_map) {
            if (result_map.hasOwnProperty(d)) {
                var ip_id = result_map[d].split('[@]');
                results.push({
                    domain: d,
                    ip: ip_id[0],
                    id: ip_id[1]
                });
            }
        }

        return model.sortHostsResult(results);
    }

    //重新加载
    model.reload = function () {
        model.setStatus(loadData('status'));
    }

    //开关,启用暂停
    model.setStatus = function (checked) {
        var proxy = this.nowUsedProxy(),
            proxy_mode = proxy.value,
            use_domain = proxy.use;
        saveData('status', checked);
        this.checked = checked;

        var script = '';

        if (this.checked) {
            // 自定义 hosts
            var results = model.getEnabledHosts();
            // 走代理的设置
            use_domain.map(function (domain) {
                if (domain == '') return;
                results.push({
                    domain: domain,
                    ip: '-1',
                    proxy: proxy_mode
                })
                return;
            })
            // 每一行IP设置规则
            results.map(function (elem) {
                if (elem.domain == '') return;
                var port = 80;
                // 设置条件
                if (elem.domain.indexOf('*') != -1) {
                    script += '}else if(shExpMatch(host,"' + elem.domain + '")){';
                } else if (elem.domain.indexOf(':') != -1) {
                    var t = elem.domain.split(':');
                    port = t[1];
                    script += '}else if(shExpMatch(url,"http://' + elem.domain + '/*")){';
                } else {
                    script += '}else if(host == "' + elem.domain + '"){';
                }
                // 设置端口
                if (elem.ip.indexOf(':') > -1) {
                    var ip_port = elem.ip.split(':');
                    elem.ip = ip_port[ip_port.length - 2];
                    port = ip_port[ip_port.length - 1];
                }

                // 错误的
                if (elem.ip == false) {
                    script += 'return "DIRECT";';
                    // 有代理设置的，就是走代理的
                } else if (typeof (elem.proxy) != 'undefined') {
                    script += 'return "' + elem.proxy + '";';
                    // 其他的就是：自定义hosts
                } else {
                    script += 'return "PROXY ' + elem.ip + ':' + port + '; DIRECT";';
                }
                script += "\n";
                return;
            })

            // 有设置host的走host
            // 有设置proxy的走proxy
            // 其他走系统
            var chromeProxyStr = 'function FindProxyForURL(url,host){ \n if(shExpMatch(url,"http:*") || shExpMatch(url,"https:*")){if(isPlainHostName(host)){return "DIRECT";' +
                script + '}else{return "DIRECT";}}else{return "DIRECT";}}';
            console.log(chromeProxyStr);
            chrome.proxy.settings.set({
                value: {
                    mode: 'pac_script',
                    pacScript: {
                        data: chromeProxyStr
                    }
                },
                scope: 'regular'
            }, function () {
            });
        } else {
            chrome.proxy.settings.set({
                value: {
                    mode: 'system'
                },
                scope: 'regular'
            }, $.noop);
        }
    }
    //移除主机
    model.removeHost = function (id) {
        var hosts = loadData('hosts');
        model.disableHosts(id);
        delete hosts[id];
        saveData('hosts', hosts);
        model.reload();
    }

    model.enableHosts = function (ids) {
        var hosts = loadData('hosts');
        for (var i = 0; i < ids.length; i++) {
            if (hosts[ids[i]]) {
                hosts[ids[i]].status = 1;
            }
        }

        saveData('hosts', hosts);
        model.reload();
    }
    model.disableHosts = function (hostIdArr) {
        var hosts = loadData('hosts');
        for (var i = 0; i < hostIdArr.length; i++) {
            if (hosts[hostIdArr[i]]) {
                hosts[hostIdArr[i]].status = 0;
            }
        }

        saveData('hosts', hosts);
        model.reload();
    }

    model.updateHost = function (info) {
        var hosts = loadData('hosts');
        var origin_status = (hosts[info.id]).status;

        info.status = 0;
        hosts[info.id] = info;
        saveData('hosts', hosts);
        if (origin_status) {
            model.enableHosts([info.id]);
        }

        model.reload();
    }

    /**
     * porxy
     */
    model.getProxy = function (name) {
        var proxyData = loadData('proxy') || [];
        if (proxyData.length == 0) {
            proxyData[0] = {
                name: 'Direct',
                value: 'DIRECT',
                use: [],
                status: 1
            }
            proxyData[1] = {
                name: 'System',
                value: 'SYSTEM',
                use: [],
                status: 0
            }
            proxyData[2] = {
                name: 'Lantern',
                value: 'PROXY 127.0.0.1:51967; DIRECT',
                use: [],
                status: 0
            }
            saveData('proxy', proxyData);
        }
        if (typeof name == 'undefined') {
            return proxyData;
        } else {
            let proxy = proxyData.map(function (elem, index) {
                if (elem.name == name) {
                    return elem;
                }
            })
            return proxy;
        }
    }

    model.nowUsedProxy = function () {
        var proxyData = loadData('proxy') || [],
            res = proxyData[0]
        proxyData.map(function (elem, index) {
            if (elem.status == 1) {
                res = elem;
                return;
            }
        })
        return res;
    }

    model.useProxy = function (id) {
        var proxyData = loadData('proxy') || [];
        try {
            proxyData.map(function (elem, index) {
                if (id == index) {
                    elem.status = 1;
                } else {
                    elem.status = 0;
                }
                return elem;
            });
            saveData('proxy', proxyData);
        } catch (e) {
        }
        model.reload();
    }

    model.addOrUpdateProxy = function (proxy) {
        let proxyData = loadData('proxy');
        for (let i = 0; i < proxyData.length; i++) {
            if (proxy.name == proxyData[i].name) {
                proxyData[i] = proxy
                saveData('proxy', proxyData);
                return i;
            }
        }
        proxyData.push(proxy);
        saveData('proxy', proxyData);
        return proxyData.length - 1;
    }

    function refreshDataForBk(do_off) {
        chrome.extension.sendRequest(do_off ? [] : model.getEnabledHosts(), function (data) {
            // do Something;
        });
    }

    function saveData(name, value) {
        localStorage[name] = JSON.stringify(value);
        // chrome.storage.sync.set({name: JSON.stringify(value)}, function() {
        //     console.log('snail-host-' + name, JSON.stringify(value))
        // });
        refreshDataForBk();
    }

    function loadData(name) {
        var s = localStorage[name];
        if (s) {
            try {
                return JSON.parse(s);
            } catch (e) {

            }
        }
        return false;
    }

    window.Model = model;

    // init status as true
    if (localStorage['status'] === undefined) {
        model.setStatus(true, 'DIRECT');
    }
})(window);
