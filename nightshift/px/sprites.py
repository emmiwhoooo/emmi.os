# night shift — 16x16 pixel sprites. chars -> palette keys.
#
# Same rules as the window seat's sheet: 16 rows of exactly 16 characters (wide
# sprites: 32), ASCII only, and any character not in PAL renders as nothing.
# Unlike that sheet, this one REFUSES a bad map instead of punching a silent
# hole in it — see check() below.

PAL = dict(o="#070912", O="#2A3350",              # outline / soft outline
           M="#ECE6C6", m="#B7B08F",              # moon / moon shade
           Y="#F2B65A", y="#B07A2E", w="#FFE7B0", # lamp amber dark/mid/light
           C="#8E7CC3", c="#5F5190",              # mug lilac
           B="#4A5578", b="#7884AA",              # owl / night blue
           S="#C9D3F2", s="#8E9AC6",              # starlight
           g="#7FE0A8", G="#3E8E66",              # phosphor
           K="#E8E6F0", k="#9BA1BF",              # clock face
           P="#D9D2BE", p="#A39C88",              # paper
           N="#3A4260")                           # lamp base

S = {}


def crescent():
    """The moon is drawn, not typed: a disc minus an offset disc, then a
    one-pixel outline around whatever survives. Hand-typed crescents came out
    lopsided every time."""
    grid = [["." for _ in range(16)] for _ in range(16)]
    for y in range(16):
        for x in range(16):
            cx, cy = x + .5, y + .5
            inside = (cx - 7.5) ** 2 + (cy - 8) ** 2 <= 6.2 ** 2
            bite = (cx - 10.6) ** 2 + (cy - 6.4) ** 2 <= 5.2 ** 2
            if inside and not bite:
                grid[y][x] = "m" if cx < 4.2 or cy > 12 else "M"
    for y in range(16):
        for x in range(16):
            if grid[y][x] != ".":
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < 16 and 0 <= ny < 16 and grid[ny][nx] in "Mm":
                    grid[y][x] = "o"
                    break
    return "\n".join("".join(r) for r in grid)


S['moon'] = crescent()
S['lamp'] = """
................
....oooooooo....
...oyYYYYYYYo...
..oyYYYYYYYYYo..
.oyYYYYYYYYYYYo.
.oooooooooooooo.
....ow.w.w.wo...
.......oo.......
.......oNo......
........oNo.....
.........oNo....
........oNo.....
.......oNo......
.....oooooooo...
....oNNNNNNNNo..
....oooooooooo..
"""
S['mug'] = """
................
.....w...w......
....w...w.......
.....w...w......
....w...w.......
................
..oooooooooo....
..oCCCCCCCCooo..
..oCwCCCCCCo.o..
..oCwCCCCCCo.o..
..oCCCCCCCCooo..
..ocCCCCCCco....
...occccccco....
....oooooooo....
..oooooooooooo..
................
"""
S['book'] = """
................
................
.oooooo..oooooo.
.oPPPPPooPPPPPo.
.oPoooPooPoooPo.
.oPPPPPooPPPPPo.
.oPooPPooPoooPo.
.oPPPPPooPPPPPo.
.oPoooPooPooPPo.
.oPPPPPooPPPPPo.
.oPPPPPooPPPPPo.
.oppppppppppppo.
.oooooooooooooo.
................
................
................
"""
S['clock'] = """
................
.....oooooo.....
...ooKKKKKKoo...
..oKKKKKoKKKKo..
..oKKKKKoKKKKo..
.oKKKKKKoKKKKKo.
.oKKKKKKoKKKKKo.
.oKKKKKKooooKKo.
.oKKKKKKKKKKKKo.
.okKKKKKKKKKKKo.
..okKKKKKKKKKo..
..okkKKKKKKKko..
...ookkkkkkoo...
.....oooooo.....
................
................
"""
S['star'] = """
................
.......oo.......
.......oo.......
......oSSo......
......oSSo......
.....oSwwSo.....
.ooooSwwwwSoooo.
.oSSwwwwwwwwSSo.
.oSSwwwwwwwwSSo.
.ooooSwwwwSoooo.
.....oSwwSo.....
......oSSo......
......oSSo......
.......oo.......
.......oo.......
................
"""
S['owl'] = """
................
..oo........oo..
..oBoo....ooBo..
..oBBBooooBBBo..
.oBBBBBBBBBBBBo.
.oBwwwBBBBwwwBo.
.oBwoYwBBwYowBo.
.oBwwwBBBBwwwBo.
.oBBBBBYYBBBBBo.
.oBBBbBBBBbBBBo.
.oBBbbbBBbbbBBo.
..oBBbbbbbbBBo..
..oBBBbbbbBBBo..
...ooBBBBBBoo...
....oYo..oYo....
................
"""
S['card'] = """
................
..oooooooooooo..
..oPPPPPPPPPPo..
..oPooooooooPo..
..oPPPPPPPPPPo..
..oPgPpPPgPpPo..
..oPPPPPPPPPPo..
..oPpPgPPpPgPo..
..oPPPPPPPPPPo..
..oPgPpPPgPpPo..
..oPPPPPPPPPPo..
..oPpPpPPpPpPo..
..oPPPPPPPPPPo..
..oooooooooooo..
................
................
"""
S['gavel'] = """
................
.........oooo...
........oyYYyo..
.......oyYYYyo..
......oyYYYyo...
.....oyYYYyo....
....ooyYyoo.....
...oyoyyo.......
..oyyoo.........
.oyyo...........
.oyo............
.oo.............
................
..oooooooooo....
..oyyyyyyyyo....
..oooooooooo....
"""
S['coin'] = """
................
.....oooooo.....
...ooYYYYYYoo...
..oYYwwwwwwYYo..
.oYYwwYYYYwwYYo.
.oYwwYYyyYYwwYo.
.oYwYYyyyyYYwYo.
.oYwYYyyyyYYwYo.
.oYwwYYyyYYwwYo.
.oYYwwYYYYwwYYo.
..oYYwwwwwwYYo..
...ooYYYYYYoo...
.....oooooo.....
................
................
................
"""


def rows_of(name, grid, w, h):
    return grid.strip("\n").split("\n")


def check(name, grid, w=16, h=16):
    """Refuse the map rather than ship a hole. The window seat lost pixels to a
    Cyrillic о and a stray uppercase K before anyone noticed."""
    rows = rows_of(name, grid, w, h)
    if len(rows) != h:
        raise SystemExit(f"{name}: {len(rows)} rows, need {h}")
    for i, r in enumerate(rows):
        if len(r) != w:
            raise SystemExit(f"{name}: row {i} is {len(r)} wide, need {w}: {r!r}")
        bad = sorted({ch for ch in r if ch != "." and ch not in PAL})
        if bad:
            raise SystemExit(f"{name}: row {i} has characters not in PAL: {bad}")
    return rows


def to_svg(name, grid, w=16, h=16):
    rows = check(name, grid, w, h)
    out = [f'<symbol id="px-{name}" viewBox="0 0 {w} {h}">']
    for y, row in enumerate(rows):
        x = 0
        while x < w:
            ch = row[x]
            if ch in PAL:
                run = 1
                while x + run < w and row[x + run] == ch:
                    run += 1
                out.append(f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{PAL[ch]}"/>')
                x += run
            else:
                x += 1
    out.append('</symbol>')
    return "".join(out)


if __name__ == "__main__":
    syms = "\n".join(to_svg(n, g) for n, g in S.items())
    open("sprites.svg", "w").write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><defs>\n' + syms + '\n</defs></svg>')
    n = len(S); cols = 5; nrows = (n + cols - 1) // cols
    cell = 96
    body = []
    for i, name in enumerate(S):
        cx = (i % cols) * cell + 8; cy = (i // cols) * (cell + 18) + 8
        body.append(f'<use href="#px-{name}" x="{cx}" y="{cy}" width="80" height="80"/>')
        body.append(f'<text x="{cx}" y="{cy+92}" font-family="monospace" font-size="11" fill="#99A0C2">{name}</text>')
    open("preview.svg", "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{cols*cell+16}" height="{nrows*(cell+18)+16}">'
        f'<rect width="100%" height="100%" fill="#0B0E1A"/><defs>{syms}</defs>'
        f'<g shape-rendering="crispEdges">{"".join(body)}</g></svg>')
    print("sprites:", ", ".join(S))
